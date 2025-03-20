import { API_URL } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
  const questionContainer = document.getElementById("question-container");
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const submitButton = document.getElementById("submit-button");
  const resultsContainer = document.getElementById("results-container");
  const answersDisplay = document.getElementById("answers-display");
  const completionTimeDisplay = document.getElementById("completion-time");
  const navigationButtons = document.getElementById("navigation-buttons");
  console.log("navigationButtons:", navigationButtons);

  let questionnaireId;
  let questions = [];
  let currentQuestionIndex = 0;
  let userAnswers = {};
  let startTime;

  function loadQuestionnaire() {
    startTime = new Date();

    const urlParams = new URLSearchParams(window.location.search);
    questionnaireId = urlParams.get("id");

    if (questionnaireId) {
      fetch(`${API_URL}/api/questionnaires/${questionnaireId}/questions`)
        .then((response) => response.json())
        .then((data) => {
          questions = data;
          if (questions.length > 0) {
            startTime = new Date();
            displayQuestion();
          } else {
            questionContainer.innerHTML =
              "<p>В опитувальнику немає питань.</p>";
          }
        })
        .catch((error) => {
          console.error("Error fetching questions:", error);
          questionContainer.innerHTML = "<p>Помилка завантаження питань.</p>";
        });
    } else {
      questionContainer.innerHTML = "<p>Не вказано ID опитувальника.</p>";
    }
  }

  function displayQuestion() {
    const questionData = questions[currentQuestionIndex];
    if (!questionData) return;

    questionContainer.innerHTML = "";
    const questionElement = document.createElement("div");
    questionElement.classList.add("question");
    questionElement.innerHTML = `<h3>${currentQuestionIndex + 1}. ${
      questionData.text
    }</h3>`;
    questionContainer.appendChild(questionElement);

    const answerOptionsContainer = document.createElement("div");
    answerOptionsContainer.classList.add("answer-options");

    if (questionData.type === "text") {
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.classList.add("text-answer-input");
      if (userAnswers[questionData.id]) {
        textInput.value = userAnswers[questionData.id];
      }
      textInput.addEventListener("change", (event) => {
        userAnswers[questionData.id] = event.target.value;
      });
      answerOptionsContainer.appendChild(textInput);
    } else if (
      questionData.type === "single-choice" ||
      questionData.type === "multiple-choice"
    ) {
      fetch(`${API_URL}/api/questions/${questionData.id}/answers`)
        .then((response) => response.json())
        .then((answerOptions) => {
          answerOptions.forEach((answerText) => {
            const choiceContainer = document.createElement("div");
            choiceContainer.classList.add("choice-container");

            let choiceInput;
            if (questionData.type === "single-choice") {
              choiceInput = document.createElement("input");
              choiceInput.type = "radio";
              choiceInput.name = `question-${currentQuestionIndex}`;
              choiceInput.value = answerText;
              if (userAnswers[questionData.id] === answerText) {
                choiceInput.checked = true;
              }
              choiceInput.addEventListener("change", (event) => {
                userAnswers[questionData.id] = event.target.value;
              });
            } else if (questionData.type === "multiple-choice") {
              choiceInput = document.createElement("input");
              choiceInput.type = "checkbox";
              choiceInput.value = answerText;
              if (
                Array.isArray(userAnswers[questionData.id]) &&
                userAnswers[questionData.id].includes(answerText)
              ) {
                choiceInput.checked = true;
              }
              choiceInput.addEventListener("change", (event) => {
                if (!userAnswers[questionData.id]) {
                  userAnswers[questionData.id] = [];
                }
                if (event.target.checked) {
                  userAnswers[questionData.id].push(event.target.value);
                } else {
                  userAnswers[questionData.id] = userAnswers[
                    questionData.id
                  ].filter((answer) => answer !== event.target.value);
                }
              });
            }
            choiceInput.classList.add("choice-input");
            choiceContainer.appendChild(choiceInput);

            const choiceLabel = document.createElement("label");
            choiceLabel.classList.add("choice-label");
            choiceLabel.textContent = answerText;
            choiceContainer.appendChild(choiceLabel);

            answerOptionsContainer.appendChild(choiceContainer);
          });
        });
    }

    questionContainer.appendChild(answerOptionsContainer);
    updateNavigationButtons();
  }

  function updateNavigationButtons() {
    prevButton.disabled = currentQuestionIndex === 0;
    nextButton.style.display =
      currentQuestionIndex < questions.length - 1 ? "inline-block" : "none";
    submitButton.style.display =
      currentQuestionIndex === questions.length - 1 ? "inline-block" : "none";
  }

  prevButton.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      displayQuestion();
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      displayQuestion();
    }
  });

  submitButton.addEventListener("click", () => {
    const endTime = new Date();
    const timeTaken = endTime - startTime;

    const responsesArray = [];
    questions.forEach((question) => {
      responsesArray.push({
        questionId: question.id,
        answer: userAnswers[question.id] || "",
      });
    });

    const completionTimeFormatted = endTime.toISOString();

    const requestData = {
      responses: responsesArray,
      completionTime: completionTimeFormatted,
    };

    fetch(`${API_URL}/api/questionnaires/${questionnaireId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Responses saved:", data);
        displayResults(timeTaken);
      })
      .catch((error) => {
        console.error("Error submitting responses:", error);
        alert("Помилка відправки відповідей на сервер.");
      });
  });

  function displayResults(timeTaken) {
    questionContainer.style.display = "none";
    navigationButtons.style.display = "none";
    submitButton.style.display = "none";
    resultsContainer.style.display = "block";
    displayAnswersInResults(timeTaken);
  }

  function displayAnswersInResults(timeTaken) {
    questionContainer.style.display = "none";
    navigationButtons.style.display = "none";
    submitButton.style.display = "none";
    resultsContainer.style.display = "block";

    const timeInSeconds = Math.round(timeTaken / 1000);
    completionTimeDisplay.textContent = `Час проходження опитування: ${timeInSeconds} секунд`;
    answersDisplay.innerHTML = "";

    questions.forEach((question, index) => {
      fetch(`${API_URL}/api/questions/${question.id}/correct-answers`)
        .then((response) => response.json())
        .then((correctAnswers) => {
          const answerDiv = document.createElement("div");
          answerDiv.classList.add("result-answer");
          let userAnswerText = userAnswers[question.id];
          let isCorrect = false;

          console.log(
            `Питання ${index + 1} (ID: ${question.id}, Тип: ${question.type}):`
          );
          console.log("  Текст питання:", question.text);
          console.log(
            "  Відповідь користувача (userAnswerText):",
            userAnswerText
          );
          console.log(
            "  Правильні відповіді (correctAnswers):",
            correctAnswers
          );

          if (question.type === "text") {
            isCorrect = correctAnswers.some(
              (correctAnswer) =>
                userAnswerText &&
                correctAnswer.toLowerCase().trim() ===
                  userAnswerText.toLowerCase().trim()
            );
            console.log("  Тип питання: Текст, isCorrect:", isCorrect);
          } else if (question.type === "single-choice") {
            isCorrect = correctAnswers.includes(userAnswerText);
            console.log(
              "  Тип питання: Одиночний вибір, isCorrect:",
              isCorrect
            ); // Лог для одиночного вибору
          } else if (question.type === "multiple-choice") {
            if (
              Array.isArray(userAnswerText) &&
              Array.isArray(correctAnswers)
            ) {
              isCorrect =
                userAnswerText.length === correctAnswers.length &&
                userAnswerText.every((answer) =>
                  correctAnswers.includes(answer)
                );
            }
            console.log(
              "  Тип питання: Множинний вибір, isCorrect:",
              isCorrect
            ); // Лог для множинного вибору
          }

          console.log("  Результат isCorrect для питання:", isCorrect);

          let questionResultHTML = `<p><b>${index + 1}. ${
            question.text
          }</b><br>Ваша відповідь: `;
          let answerClass = isCorrect ? "correct-answer" : "incorrect-answer";

          if (question.type === "text") {
            questionResultHTML += `<span class="${answerClass}">${
              userAnswerText || "Відповідь не надано"
            }</span>`;
          } else if (
            question.type === "single-choice" ||
            question.type === "multiple-choice"
          ) {
            if (userAnswerText) {
              questionResultHTML += `<span class="${answerClass}">${userAnswerText}</span>`;
            } else {
              questionResultHTML += `<span class="no-answer">Відповідь не обрано</span>`;
            }
            if (!isCorrect && correctAnswers.length > 0) {
              questionResultHTML += `<br>Правильна відповідь: <span class="correct-answer">${correctAnswers.join(
                ", "
              )}</span>`;
            }
          } else {
            questionResultHTML += "Тип питання невідомий";
          }
          questionResultHTML += `</p>`;

          answerDiv.innerHTML = questionResultHTML;
          answersDisplay.appendChild(answerDiv);
        });
    });
  }

  const goHomeButton = document.getElementById("go-home-button");

  goHomeButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  loadQuestionnaire();
});
