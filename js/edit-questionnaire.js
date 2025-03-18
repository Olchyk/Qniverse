document.addEventListener("DOMContentLoaded", () => {
  const questionnaireContainer = document.getElementById(
    "questionnaire-container"
  );
  const addQuestionButton = document.getElementById("add-question-button");
  const submitButton = document.getElementById("submit-button");
  const quizTitleInput = document.getElementById("quiz-title");
  const quizDescriptionInput = document.getElementById("quiz-description");

  let questionCounter = 0;
  let questionnaireId;

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
                <option value="text">Текст</option>
                <option value="single-choice">Одиночний вибір</option>
                <option value="multiple-choice">Множинний вибір</option>
            </select>
        </div>
        <div class="answer-options" id="answer-options-${questionCounter}">
            <!-- Тут будуть додаватися варіанти відповідей для вибору -->
        </div>
        <button class="remove-question-button">Видалити</button>
    `;

    questionnaireContainer.appendChild(questionDiv);

    const questionTypeSelect = questionDiv.querySelector(".question-type");
    const answerOptionsDiv = questionDiv.querySelector(".answer-options");
    const removeQuestionButton = questionDiv.querySelector(
      ".remove-question-button"
    );

    questionTypeSelect.addEventListener("change", () => {
      updateAnswerOptions(
        questionTypeSelect.value,
        answerOptionsDiv,
        questionCounter
      );
    });

    removeQuestionButton.addEventListener("click", () => {
      questionDiv.remove();
      recalculateQuestionNumbers();
    });

    recalculateQuestionNumbers();
  }
  addQuestionButton.addEventListener("click", addQuestion);

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
      }
      questionnaireData.questions.push(questionData);
    });

    const method = "POST";
    const apiUrl = "http://localhost:3000/api/questionnaires";

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
  function loadQuestionnaireForEdit() {
    const urlParams = new URLSearchParams(window.location.search);
    questionnaireId = urlParams.get("id");

    if (questionnaireId) {
      fetch(`http://localhost:3000/api/questionnaires/${questionnaireId}/edit`)
        .then((response) => response.json())
        .then((questionnaireData) => {
          console.log("Отримані дані:", questionnaireData);

          quizTitleInput.value = questionnaireData.title;
          quizDescriptionInput.value = questionnaireData.description;

          questionnaireData.questions.forEach((question) => {
            console.log("Питання:", question.text);
            console.log("Правильні відповіді:", question.correctAnswers);
            addQuestionWithData(question);
          });
        })
        .catch((error) => {
          console.error("Помилка завантаження:", error);
          alert("Помилка завантаження опитувальника для редагування.");
        });
    } else {
      addQuestion();
    }
  }

  function addQuestionWithData(questionData) {
    questionCounter++;
    const questionDiv = document.createElement("div");
    questionDiv.classList.add("question");
    questionDiv.dataset.questionId = questionData.id;

    questionDiv.innerHTML = `
        <div>
            <label class="question-label">Питання ${questionCounter}:</label>
            <input type="text" id="question-text-${questionCounter}" class="question-text" placeholder="Введіть питання" value="${
      questionData.text
    }">
        </div>
        <div>
            <label for="question-type-${questionCounter}">Тип:</label>
            <select id="question-type-${questionCounter}" class="question-type">
                <option value="" ${
                  questionData.type === "" ? "selected" : ""
                }>Виберіть тип</option>
                <option value="text" ${
                  questionData.type === "text" ? "selected" : ""
                }>Текст</option>
                <option value="single-choice" ${
                  questionData.type === "single-choice" ? "selected" : ""
                }>Одиночний вибір</option>
                <option value="multiple-choice" ${
                  questionData.type === "multiple-choice" ? "selected" : ""
                }>Множинний вибір</option>
            </select>
        </div>
        <div class="answer-options" id="answer-options-${questionCounter}">
            <!-- Сюди додамо відповіді -->
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
    const correctAnswerTextContainer = questionDiv.querySelector(
      ".correct-answer-text-container"
    );
    const correctAnswerTextInput = questionDiv.querySelector(
      ".correct-answer-text-input"
    );
    const removeQuestionButton = questionDiv.querySelector(
      ".remove-question-button"
    );

    console.log(
      `Перевірка correctAnswers для питання "${questionData.text}":`,
      questionData.correctAnswers
    );

    if (questionData.type === "text") {
      correctAnswerTextContainer.style.display = "block";

      if (
        Array.isArray(questionData.correctAnswers) &&
        questionData.correctAnswers.length > 0
      ) {
        correctAnswerTextInput.value = questionData.correctAnswers[0];
      } else {
        correctAnswerTextInput.value = "";
      }
    }

    questionTypeSelect.addEventListener("change", () => {
      updateAnswerOptions(
        questionTypeSelect.value,
        answerOptionsDiv,
        questionCounter
      );

      correctAnswerTextContainer.style.display =
        questionTypeSelect.value === "text" ? "block" : "none";
      answerOptionsDiv.style.display =
        questionTypeSelect.value === "single-choice" ||
        questionTypeSelect.value === "multiple-choice"
          ? "block"
          : "none";
    });

    removeQuestionButton.addEventListener("click", () => {
      questionDiv.remove();
      recalculateQuestionNumbers();
    });

    if (questionData.answers && questionData.answers.length > 0) {
      questionData.answers.forEach((answerText) => {
        addAnswerChoiceWithData(
          answerOptionsDiv,
          questionData.type,
          questionCounter,
          answerText,
          questionData.correctAnswers
        );
      });
    }

    recalculateQuestionNumbers();
  }

  function addAnswerChoiceWithData(
    answerOptionsDiv,
    questionType,
    questionCounter,
    answerText,
    correctAnswersForQuestion
  ) {
    const choiceRow = document.createElement("div");
    choiceRow.classList.add("choice-row");

    const isCorrect = correctAnswersForQuestion.includes(answerText)
      ? "checked"
      : "";

    choiceRow.innerHTML = `
        <label class="choice-label">Варіант :</label>
        <input type="text" class="choice-text" placeholder="Введіть варіант" value="${answerText}">
        <div class="correct-answer-indicator">
            <label>Правильна відповідь:</label>
            <input type="${
              questionType === "single-choice" ? "radio" : "checkbox"
            }"
                name="correct-answer-${questionCounter}"
                class="correct-answer-checkbox" ${isCorrect}>
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

  addQuestionButton.addEventListener("click", addQuestion);
  submitButton.addEventListener("click", submitQuestionnaire);

  loadQuestionnaireForEdit();
});
