const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "questionnaire_db",
  password: "root",
  port: 5432,
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

// API endpoint для отримання всіх опитувальників з кількістю питань
app.get("/api/questionnaires-with-counts", async (req, res) => {
  try {
    const questionnairesResult = await pool.query(
      "SELECT id, title, description FROM questionnaires"
    );
    const questionnaires = questionnairesResult.rows;

    const questionnairesWithCounts = [];
    for (const questionnaire of questionnaires) {
      const questionsCountResult = await pool.query(
        "SELECT COUNT(*) FROM questions WHERE questionnaire_id = $1",
        [questionnaire.id]
      );
      const questionsCount = parseInt(questionsCountResult.rows[0].count, 10); // Перетворюємо count в число
      questionnairesWithCounts.push({
        id: questionnaire.id,
        title: questionnaire.title,
        description: questionnaire.description,
        questionsCount: questionsCount,
      });
    }

    res.status(200).send(questionnairesWithCounts);
  } catch (error) {
    console.error("Error fetching questionnaires with counts:", error);
    res
      .status(500)
      .send({ error: "Failed to fetch questionnaires with counts" });
  }
});

app.delete("/api/questionnaires/:id", async (req, res) => {
  const questionnaireId = req.params.id;
  try {
    console.log(
      "Видалення відповідей користувачів для опитувальника ID:",
      questionnaireId
    ); // Доданий console.log перед запитом

    // 1. Видалити записи з таблиці answers, пов'язані з питаннями опитувальника
    await pool.query(
      "DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE questionnaire_id = $1)",
      [questionnaireId]
    );

    // 2. Видалити відповіді користувачів (user_responses), пов'язані з питаннями цього опитувальника
    await pool.query(
      "DELETE FROM user_responses WHERE question_id IN (SELECT id FROM questions WHERE questionnaire_id = $1)",
      [questionnaireId]
    );

    // 3. Видалити питання, пов'язані з опитувальником
    await pool.query("DELETE FROM questions WHERE questionnaire_id = $1", [
      questionnaireId,
    ]);

    // 4. Видалити сам опитувальник
    const questionnaireResult = await pool.query(
      "DELETE FROM questionnaires WHERE id = $1",
      [questionnaireId]
    );

    if (questionnaireResult.rowCount > 0) {
      res.status(200).send({ message: "Questionnaire deleted successfully!" });
    } else {
      res.status(404).send({ error: "Questionnaire not found" }); // Якщо опитувальник не знайдено
    }

    console.log(
      "Відповіді користувачів видалено для опитувальника ID:",
      questionnaireId
    ); // Доданий console.log після запиту
  } catch (error) {
    console.error("Error deleting questionnaire:", error);
    res.status(500).send({ error: "Failed to delete questionnaire" });
  }
});

// API endpoint для отримання опитувальника для редагування разом з питаннями та відповідями
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
        "SELECT text FROM answers WHERE question_id = $1",
        [question.id]
      );
      question.answers = answersResult.rows.map((row) => row.text);

      // Fetch correct answers for each question
      const correctAnswersResult = await pool.query(
        "SELECT text FROM correct_answers WHERE question_id = $1",
        [question.id]
      );
      question.correctAnswers = correctAnswersResult.rows.map(
        (row) => row.text
      ); // Add correctAnswers to question object
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

    // Видаляємо старі відповіді перед оновленням
    await pool.query(
      "DELETE FROM correct_answers WHERE question_id IN (SELECT id FROM questions WHERE questionnaire_id = $1)",
      [questionnaireId]
    );
    await pool.query(
      "DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE questionnaire_id = $1)",
      [questionnaireId]
    );
    await pool.query("DELETE FROM questions WHERE questionnaire_id = $1", [
      questionnaireId,
    ]);

    // Додаємо оновлені питання та відповіді
    for (const question of updatedQuestionnaireData.questions) {
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

    res.status(200).send({ message: "Questionnaire updated successfully!" });
  } catch (error) {
    console.error("Error updating questionnaire:", error);
    res.status(500).send({ error: "Failed to update questionnaire" });
  }
});

// API endpoint для отримання питань опитувальника за ID
app.get("/api/questionnaires/:id/questions", async (req, res) => {
  const questionnaireId = req.params.id;
  try {
    const questionsResult = await pool.query(
      "SELECT id, text, type FROM questions WHERE questionnaire_id = $1 ORDER BY id ASC",
      [questionnaireId]
    ); // Отримуємо питання в порядку ID
    const questions = questionsResult.rows;
    res.status(200).send(questions);
  } catch (error) {
    console.error("Error fetching questions for questionnaire:", error);
    res
      .status(500)
      .send({ error: "Failed to fetch questions for questionnaire" });
  }
});
// API endpoint для отримання варіантів відповідей для конкретного питання
app.get("/api/questions/:id/answers", async (req, res) => {
  const questionId = req.params.id;
  try {
    const answersResult = await pool.query(
      "SELECT text FROM answers WHERE question_id = $1",
      [questionId]
    );
    const answers = answersResult.rows.map((row) => row.text); // Отримуємо тільки текст варіантів
    res.status(200).send(answers);
  } catch (error) {
    console.error("Error fetching answers for question:", error);
    res.status(500).send({ error: "Failed to fetch answers for question" });
  }
});
// API endpoint для збереження відповідей користувача після проходження опитувальника
app.post("/api/questionnaires/:id/submit", async (req, res) => {
  const questionnaireId = req.params.id;
  const userResponsesData = req.body.responses; // Очікуємо масив відповідей від frontend
  const completionTime = req.body.completionTime; // Отримуємо час завершення

  if (!userResponsesData || !Array.isArray(userResponsesData)) {
    return res.status(400).send({ error: "Invalid responses data" });
  }

  try {
    for (const response of userResponsesData) {
      await pool.query(
        "INSERT INTO user_responses (questionnaire_id, question_id, user_answer, completion_time) VALUES ($1, $2, $3, $4)",
        [
          questionnaireId,
          response.questionId,
          response.answer,
          completionTime, // Зберігаємо час завершення для кожної відповіді (можна і для всього опитування)
        ]
      );
    }

    res.status(200).send({ message: "Responses saved successfully!" });
  } catch (error) {
    console.error("Error saving user responses:", error);
    res.status(500).send({ error: "Failed to save user responses" });
  }
});

// API endpoint для отримання правильних відповідей для конкретного питання
app.get("/api/questions/:id/correct-answers", async (req, res) => {
  const questionId = req.params.id;
  try {
    const correctAnswersResult = await pool.query(
      "SELECT text FROM correct_answers WHERE question_id = $1",
      [questionId]
    );
    const correctAnswers = correctAnswersResult.rows.map((row) => row.text); // Отримуємо тільки текст правильних відповідей
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

    // Отримання загальної кількості записів
    const totalCountResult = await pool.query(
      "SELECT COUNT(*) FROM questionnaires"
    );
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // Отримання списку опитувальників з пагінацією
    const questionnairesResult = await pool.query(
      "SELECT id, title, description FROM questionnaires ORDER BY id LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    const questionnaires = questionnairesResult.rows;

    // Додаємо кількість питань
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

    // **Тепер повертаємо ОБ'ЄКТ, а не масив**
    res.status(200).send({
      questionnaires: questionnairesWithCounts,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Помилка отримання опитувальників:", error);
    res.status(500).send({ error: "Не вдалося отримати опитувальники" });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
