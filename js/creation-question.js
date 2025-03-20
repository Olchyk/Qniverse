import { API_URL } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
  const addQuestionButton = document.getElementById("add-question-button");
  const submitButton = document.getElementById("submit-button");
  const questionnaireContainer = document.getElementById(
    "questionnaire-container"
  );

  console.log("Перевірка наявності елементів:");
  console.log("addQuestionButton:", addQuestionButton);
  console.log("submitButton:", submitButton);
  console.log("Сторінка завантажена. Можна працювати.");

  let questionCounter = 0;

  addQuestionButton.addEventListener("click", addQuestion);
  submitButton.addEventListener("click", submitQuestionnaire);

  function addQuestion() {
    questionCounter++;
    const questionDiv = document.createElement("div");
    questionDiv.classList.add("question");
    questionDiv.dataset.questionId = questionCounter;

    questionDiv.innerHTML = `
    <div>
        <label class="question-label">Питання :</label>
        <input type="text" id="question-text-${questionCounter}" class="question-text" placeholder="Введіть питання">
    </div>
    <div>
        <label for="question-type-${questionCounter}">Тип:</label>
        <select id="question-type-${questionCounter}" class="question-type">
            <option value="" selected>Виберіть тип</option>  <!-- Нова опція "Виберіть тип" -->
            <option value="text">Текст</option>
            <option value="single-choice">Одиночний вибір</option>
            <option value="multiple-choice">Множинний вибір</option>
        </select>
    </div>
    <div class="answer-options" id="answer-options-${questionCounter}">
        <!-- Тут будуть додаватися варіанти відповідей для вибору -->
    </div>
    <div class="correct-answer-text-container" id="correct-answer-text-container-${questionCounter}" style="display: none;">
        <label for="correct-answer-text-${questionCounter}">Правильна відповідь:</label>
        <input type="text" id="correct-answer-text-${questionCounter}" class="correct-answer-text-input" placeholder="Введіть правильну відповідь">
    </div>
    <button class="remove-question-button">Видалити</button>
`;

    questionnaireContainer.appendChild(questionDiv);

    const questionTypeSelect = questionDiv.querySelector(".question-type");
    const answerOptionsDiv = questionDiv.querySelector(".answer-options");
    const removeQuestionButton = questionDiv.querySelector(
      ".remove-question-button"
    );
    const correctAnswerTextContainer = questionDiv.querySelector(
      ".correct-answer-text-container"
    );

    questionTypeSelect.addEventListener("change", () => {
      const selectedQuestionType = questionTypeSelect.value;
      updateAnswerOptions(
        selectedQuestionType,
        answerOptionsDiv,
        questionCounter
      );
      correctAnswerTextContainer.style.display =
        selectedQuestionType === "text" ? "block" : "none";
      answerOptionsDiv.style.display =
        selectedQuestionType === "single-choice" ||
        selectedQuestionType === "multiple-choice"
          ? "block"
          : "none";
    });

    removeQuestionButton.addEventListener("click", () => {
      questionDiv.remove();
      recalculateQuestionNumbers();
    });

    recalculateQuestionNumbers();
  }

  function updateAnswerOptions(
    questionType,
    answerOptionsDiv,
    questionCounter
  ) {
    answerOptionsDiv.innerHTML = "";

    if (
      questionType === "single-choice" ||
      questionType === "multiple-choice"
    ) {
      const addChoiceButton = document.createElement("button");
      addChoiceButton.textContent = "Додати варіант";
      addChoiceButton.addEventListener("click", () => {
        addAnswerChoice(answerOptionsDiv, questionType, questionCounter);
      });
      answerOptionsDiv.appendChild(addChoiceButton);
    }
  }

  function addAnswerChoice(answerOptionsDiv, questionType, questionCounter) {
    const choiceRow = document.createElement("div");
    choiceRow.classList.add("choice-row");
    choiceRow.innerHTML = `
        <label class="choice-label">Варіант :</label>
        <input type="text" class="choice-text" placeholder="Введіть варіант">
        <div class="correct-answer-indicator">
            <label>Правильна відповідь:</label>
            <input type="${
              questionType === "single-choice" ? "radio" : "checkbox"
            }" name="correct-answer-${questionCounter}" class="correct-answer-checkbox">
        </div>
        <button class="remove-choice-button">Видалити</button>
    `;
    answerOptionsDiv.appendChild(choiceRow);

    const removeChoiceButton = choiceRow.querySelector(".remove-choice-button");
    removeChoiceButton.addEventListener("click", () => {
      choiceRow.remove();
      recalculateChoiceNumbers(answerOptionsDiv);
    });
    recalculateChoiceNumbers(answerOptionsDiv);
  }

  function recalculateQuestionNumbers() {
    const questionDivs = questionnaireContainer.querySelectorAll(".question");
    questionDivs.forEach((questionDiv, index) => {
      const questionLabel = questionDiv.querySelector(".question-label");
      questionLabel.textContent = `Питання ${index + 1}:`;
    });
  }

  function recalculateChoiceNumbers(answerOptionsDiv) {
    const choiceRows = answerOptionsDiv.querySelectorAll(".choice-row");
    choiceRows.forEach((choiceRow, index) => {
      const choiceLabel = choiceRow.querySelector(".choice-label");
      choiceLabel.textContent = `Варіант ${index + 1}:`;
    });
  }

  function submitQuestionnaire() {
    const questionnaireData = {
      title: document.getElementById("quiz-title").value,
      description: document.getElementById("quiz-description").value,
      questions: [],
    };
    const questionnaireContainer = document.getElementById(
      "questionnaire-container"
    );
    const questionDivs = questionnaireContainer.querySelectorAll(".question");

    questionDivs.forEach((questionDiv, index) => {
      const questionId = questionDiv.dataset.questionId;
      const questionText = questionDiv.querySelector(".question-text").value;
      const questionType = questionDiv.querySelector(".question-type").value;
      const questionData = {
        id: questionId,
        text: questionText,
        type: questionType,
        answers: [],
        correctAnswers: [],
      };

      if (
        questionType === "single-choice" ||
        questionType === "multiple-choice"
      ) {
        const choiceRows = questionDiv.querySelectorAll(".choice-row");
        choiceRows.forEach((choiceRow) => {
          const choiceText = choiceRow.querySelector(".choice-text").value;
          const isCorrectAnswer = choiceRow.querySelector(
            ".correct-answer-checkbox"
          ).checked;
          questionData.answers.push(choiceText);
          if (isCorrectAnswer) {
            questionData.correctAnswers.push(choiceText);
          }
        });
      } else if (questionType === "text") {
        const correctAnswerInput = questionDiv.querySelector(
          ".correct-answer-text-input"
        );
        if (correctAnswerInput) {
          questionData.correctAnswers.push(correctAnswerInput.value);
        }
      }
      questionnaireData.questions.push(questionData);
    });

    const method = "POST";
    const apiUrl = "${API_URL}/api/questionnaires";

    fetch(apiUrl, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(questionnaireData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        alert("Опитувальник успішно збережено!");
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Помилка збереження опитувальника.");
      });
  }
});
