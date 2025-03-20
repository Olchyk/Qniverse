const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: "questionnaire_db_aq0y_user",
  host: "dpg-cvdugvdsvqrc73f5mnr0-a.oregon-postgres.render.com",
  database: "questionnaire_db_aq0y",
  password: "944xGtpJUBSGkJxrnnkwJumuvDKOWdQi",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("The database is connected! Current time:", res.rows[0]);
  }
});

app.post("/api/questionnaires", async (req, res) => {
  const questionnaireData = req.body;
  try {
    const questionnaireResult = await pool.query(
      "INSERT INTO questionnaires (title, description) VALUES ($1, $2) RETURNING id",
      [questionnaireData.title, questionnaireData.description]
    );
    const questionnaireId = questionnaireResult.rows[0].id;

    for (const question of questionnaireData.questions) {
      const questionResult = await pool.query(
        "INSERT INTO questions (questionnaire_id, text, type) VALUES ($1, $2, $3) RETURNING id",
        [questionnaireId, question.text, question.type]
      );
      const questionId = questionResult.rows[0].id;

      if (question.type === "text" && question.correctAnswers.length > 0) {
        await pool.query(
          "INSERT INTO correct_answers (question_id, text) VALUES ($1, $2)",
          [questionId, question.correctAnswers[0]]
        );
      } else if (question.answers && question.answers.length > 0) {
        for (const answerText of question.answers) {
          await pool.query(
            "INSERT INTO answers (question_id, text) VALUES ($1, $2)",
            [questionId, answerText]
          );
        }
      }
    }

    res.status(201).send({
      message: "Questionnaire saved successfully!",
      questionnaireId: questionnaireId,
    });
  } catch (error) {
    console.error("Error saving questionnaire:", error);
    res.status(500).send({ error: "Failed to save questionnaire" });
  }
});

app.get("/api/questionnaires", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM questionnaires");
    res.status(200).send(result.rows);
  } catch (error) {
    console.error("Error fetching questionnaires:", error);
    res.status(500).send({ error: "Failed to fetch questionnaires" });
  }
});

app.get("/api/questionnaires-with-counts", async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 5;

    const offset = (page - 1) * limit;

    console.log(
      `We ask for questionnaires: page=${page}, limit=${limit}, offset=${offset}`
    );

    const totalCountResult = await pool.query(
      "SELECT COUNT(*) FROM questionnaires"
    );
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    const questionnairesResult = await pool.query(
      "SELECT id, title, description FROM questionnaires ORDER BY id LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    const questionnaires = questionnairesResult.rows;

    const questionnairesWithCounts = await Promise.all(
      questionnaires.map(async (questionnaire) => {
        const questionsCountResult = await pool.query(
          "SELECT COUNT(*) FROM questions WHERE questionnaire_id = $1",
          [questionnaire.id]
        );
        const questionsCount = parseInt(questionsCountResult.rows[0].count, 10);

        return {
          id: questionnaire.id,
          title: questionnaire.title,
          description: questionnaire.description,
          questionsCount: questionsCount,
        };
      })
    );

    res.status(200).send({
      questionnaires: questionnairesWithCounts,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error receiving questionnaires:", error);
    res.status(500).send({ error: "We could not get the questionnaires" });
  }
});

app.delete("/api/questionnaires/:id", async (req, res) => {
  const questionnaireId = req.params.id;
  try {
    console.log(
      "Delete user responses for the ID questionnaire:",
      questionnaireId
    );

    await pool.query(
      "DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE questionnaire_id = $1)",
      [questionnaireId]
    );

    await pool.query(
      "DELETE FROM user_responses WHERE question_id IN (SELECT id FROM questions WHERE questionnaire_id = $1)",
      [questionnaireId]
    );

    await pool.query("DELETE FROM questions WHERE questionnaire_id = $1", [
      questionnaireId,
    ]);

    const questionnaireResult = await pool.query(
      "DELETE FROM questionnaires WHERE id = $1",
      [questionnaireId]
    );

    if (questionnaireResult.rowCount > 0) {
      res.status(200).send({ message: "Questionnaire deleted successfully!" });
    } else {
      res.status(404).send({ error: "Questionnaire not found" });
    }

    console.log(
      "User responses have been deleted for the ID questionnaire:",
      questionnaireId
    );
  } catch (error) {
    console.error("Error deleting questionnaire:", error);
    res.status(500).send({ error: "Failed to delete questionnaire" });
  }
});

app.get("/api/questionnaires/:id/edit", async (req, res) => {
  const questionnaireId = req.params.id;
  try {
    const questionnaireResult = await pool.query(
      "SELECT id, title, description FROM questionnaires WHERE id = $1",
      [questionnaireId]
    );
    const questionnaire = questionnaireResult.rows[0];

    if (!questionnaire) {
      return res.status(404).send({ error: "Questionnaire not found" });
    }

    const questionsResult = await pool.query(
      "SELECT id, text, type FROM questions WHERE questionnaire_id = $1",
      [questionnaireId]
    );
    const questions = questionsResult.rows;

    for (const question of questions) {
      const answersResult = await pool.query(
        "SELECT id, text FROM answers WHERE question_id = $1",
        [question.id]
      );
      question.answers = answersResult.rows.map((row) => row.text);

      if (
        question.type === "single-choice" ||
        question.type === "multiple-choice"
      ) {
        const correctAnswersResult = await pool.query(
          `SELECT text FROM correct_answers WHERE question_id = $1`,
          [question.id]
        );
        question.correctAnswers = correctAnswersResult.rows.map(
          (row) => row.text
        );
        console.log(
          `Правильні відповіді для питання "${question.text}":`,
          question.correctAnswers
        );
      } else {
        question.correctAnswers = [];
      }
    }

    const questionnaireData = {
      id: questionnaire.id,
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questions,
    };

    res.status(200).send(questionnaireData);
  } catch (error) {
    console.error("Error fetching questionnaire for edit:", error);
    res.status(500).send({ error: "Failed to fetch questionnaire for edit" });
  }
});

app.put("/api/questionnaires/:id", async (req, res) => {
  const questionnaireId = req.params.id;
  const updatedQuestionnaireData = req.body;

  try {
    await pool.query(
      "UPDATE questionnaires SET title = $1, description = $2 WHERE id = $3",
      [
        updatedQuestionnaireData.title,
        updatedQuestionnaireData.description,
        questionnaireId,
      ]
    );

    for (const question of updatedQuestionnaireData.questions) {
      let questionId = question.id;

      if (!questionId) {
        // Якщо це нове питання, вставляємо його
        const questionResult = await pool.query(
          "INSERT INTO questions (questionnaire_id, text, type) VALUES ($1, $2, $3) RETURNING id",
          [questionnaireId, question.text, question.type]
        );
        questionId = questionResult.rows[0].id;
      } else {
        // Якщо питання вже існує, оновлюємо його
        await pool.query(
          "UPDATE questions SET text = $1, type = $2 WHERE id = $3",
          [question.text, question.type, questionId]
        );

        // Видаляємо старі відповіді перед оновленням
        await pool.query("DELETE FROM correct_answers WHERE question_id = $1", [
          questionId,
        ]);
        await pool.query("DELETE FROM answers WHERE question_id = $1", [
          questionId,
        ]);
      }

      if (question.type === "text" && question.correctAnswers.length > 0) {
        await pool.query(
          "INSERT INTO correct_answers (question_id, text) VALUES ($1, $2)",
          [questionId, question.correctAnswers[0]]
        );
      } else if (question.answers && question.answers.length > 0) {
        for (const answerText of question.answers) {
          const answerResult = await pool.query(
            "INSERT INTO answers (question_id, text) VALUES ($1, $2) RETURNING id",
            [questionId, answerText]
          );
          const answerId = answerResult.rows[0].id;

          if (question.correctAnswers.includes(answerText)) {
            await pool.query(
              "INSERT INTO correct_answers (question_id, text) VALUES ($1, $2)",
              [questionId, answerText]
            );
          }
        }
      }
    }

    res.status(200).send({ message: "Questionnaire updated successfully!" });
  } catch (error) {
    console.error("Error updating questionnaire:", error);
    res.status(500).send({ error: "Failed to update questionnaire" });
  }
});

app.get("/api/questionnaires/:id/questions", async (req, res) => {
  const questionnaireId = req.params.id;
  try {
    const questionsResult = await pool.query(
      "SELECT id, text, type FROM questions WHERE questionnaire_id = $1 ORDER BY id ASC",
      [questionnaireId]
    );
    const questions = questionsResult.rows;
    res.status(200).send(questions);
  } catch (error) {
    console.error("Error fetching questions for questionnaire:", error);
    res
      .status(500)
      .send({ error: "Failed to fetch questions for questionnaire" });
  }
});
app.get("/api/questions/:id/answers", async (req, res) => {
  const questionId = req.params.id;
  try {
    const answersResult = await pool.query(
      "SELECT text FROM answers WHERE question_id = $1",
      [questionId]
    );
    const answers = answersResult.rows.map((row) => row.text);
    res.status(200).send(answers);
  } catch (error) {
    console.error("Error fetching answers for question:", error);
    res.status(500).send({ error: "Failed to fetch answers for question" });
  }
});

app.post("/api/questionnaires/:id/submit", async (req, res) => {
  const questionnaireId = req.params.id;
  const userResponsesData = req.body.responses;
  const completionTime = req.body.completionTime;

  if (!userResponsesData || !Array.isArray(userResponsesData)) {
    return res.status(400).send({ error: "Invalid responses data" });
  }

  try {
    for (const response of userResponsesData) {
      await pool.query(
        "INSERT INTO user_responses (questionnaire_id, question_id, user_answer, completion_time) VALUES ($1, $2, $3, $4)",
        [questionnaireId, response.questionId, response.answer, completionTime]
      );
    }

    res.status(200).send({ message: "Responses saved successfully!" });
  } catch (error) {
    console.error("Error saving user responses:", error);
    res.status(500).send({ error: "Failed to save user responses" });
  }
});

app.get("/api/questions/:id/correct-answers", async (req, res) => {
  const questionId = req.params.id;
  try {
    const correctAnswersResult = await pool.query(
      "SELECT text FROM correct_answers WHERE question_id = $1",
      [questionId]
    );
    const correctAnswers = correctAnswersResult.rows.map((row) => row.text);
    res.status(200).send(correctAnswers);
  } catch (error) {
    console.error("Error fetching correct answers for question:", error);
    res
      .status(500)
      .send({ error: "Failed to fetch correct answers for question" });
  }
});

app.get("/api/questionnaires-with-counts", async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;

    const offset = (page - 1) * limit;

    const totalCountResult = await pool.query(
      "SELECT COUNT(*) FROM questionnaires"
    );
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    const questionnairesResult = await pool.query(
      "SELECT id, title, description FROM questionnaires ORDER BY id LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    const questionnaires = questionnairesResult.rows;

    const questionnairesWithCounts = await Promise.all(
      questionnaires.map(async (questionnaire) => {
        const questionsCountResult = await pool.query(
          "SELECT COUNT(*) FROM questions WHERE questionnaire_id = $1",
          [questionnaire.id]
        );
        const questionsCount = parseInt(questionsCountResult.rows[0].count, 10);

        return {
          id: questionnaire.id,
          title: questionnaire.title,
          description: questionnaire.description,
          questionsCount: questionsCount,
        };
      })
    );

    res.status(200).send({
      questionnaires: questionnairesWithCounts,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error receiving questionnaires:", error);
    res.status(500).send({ error: "We could not get the questionnaires" });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
