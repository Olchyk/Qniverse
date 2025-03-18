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

  let questionnaireId; // ID опитувальника, який проходимо
  let questions = []; // Масив питань опитувальника
  let currentQuestionIndex = 0; // Індекс поточного питання
  let userAnswers = {}; // Об'єкт для зберігання відповідей користувача
  let startTime; // Час початку проходження опитування

  // Функція для завантаження питань опитувальника з backend
  function loadQuestionnaire() {
    startTime = new Date();

    const urlParams = new URLSearchParams(window.location.search);
    questionnaireId = urlParams.get("id"); // Отримуємо ID опитувальника з URL

    if (questionnaireId) {
      fetch(
        `http://localhost:3000/api/questionnaires/${questionnaireId}/questions`
      ) // Створимо цей endpoint на backend
        .then((response) => response.json())
        .then((data) => {
          questions = data;
          if (questions.length > 0) {
            startTime = new Date(); // Фіксуємо час початку опитування
            displayQuestion(); // Відображаємо перше питання
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
      // Текстове питання
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.classList.add("text-answer-input");
      if (userAnswers[questionData.id]) {
        // Перевіряємо, чи є відповідь в userAnswers
        textInput.value = userAnswers[questionData.id]; // Якщо є, заповнюємо поле вводу попередньою відповіддю
      }
      textInput.addEventListener("change", (event) => {
        userAnswers[questionData.id] = event.target.value;
      });
      answerOptionsContainer.appendChild(textInput);
    } else if (
      questionData.type === "single-choice" ||
      questionData.type === "multiple-choice"
    ) {
      // Питання з вибором варіантів
      fetch(`http://localhost:3000/api/questions/${questionData.id}/answers`)
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
                // Перевіряємо, чи цей варіант був обраний раніше
                choiceInput.checked = true; // Якщо так, робимо radio кнопку обраною
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
                // Перевіряємо, чи цей варіант був обраний раніше (для множинного вибору)
                choiceInput.checked = true; // Якщо так, робимо checkbox відміченим
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

  // Функція для оновлення стану кнопок "Попереднє" та "Наступне"
  function updateNavigationButtons() {
    prevButton.disabled = currentQuestionIndex === 0; // Кнопка "Попереднє" вимкнена на першому питанні
    nextButton.style.display =
      currentQuestionIndex < questions.length - 1 ? "inline-block" : "none"; // "Наступне" показується, якщо не останнє питання
    submitButton.style.display =
      currentQuestionIndex === questions.length - 1 ? "inline-block" : "none"; // "Завершити" показується на останньому питанні
  }

  // Обробники подій для кнопок навігації
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

    fetch(
      `http://localhost:3000/api/questionnaires/${questionnaireId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("Responses saved:", data);
        displayResults(timeTaken); // Показуємо результати на сторінці
      })
      .catch((error) => {
        console.error("Error submitting responses:", error);
        alert("Помилка відправки відповідей на сервер.");
      });
  });

  function displayResults(timeTaken) {
    questionContainer.style.display = "none"; // Приховуємо питання
    navigationButtons.style.display = "none"; // Приховуємо кнопки навігації
    submitButton.style.display = "none"; // Приховуємо кнопку "Завершити опитування"
    resultsContainer.style.display = "block"; // Показуємо контейнер результатів
    displayAnswersInResults(timeTaken); // Викликаємо окрему функцію для відображення відповідей
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
      fetch(
        `http://localhost:3000/api/questions/${question.id}/correct-answers`
      )
        .then((response) => response.json())
        .then((correctAnswers) => {
          const answerDiv = document.createElement("div");
          answerDiv.classList.add("result-answer");
          let userAnswerText = userAnswers[question.id];
          let isCorrect = false;

          console.log(
            `Питання ${index + 1} (ID: ${question.id}, Тип: ${question.type}):`
          ); // Розширений лог питання
          console.log("  Текст питання:", question.text); // Текст питання
          console.log(
            "  Відповідь користувача (userAnswerText):",
            userAnswerText
          ); // Відповідь користувача
          console.log(
            "  Правильні відповіді (correctAnswers):",
            correctAnswers
          ); // Правильні відповіді

          if (question.type === "text") {
            isCorrect = correctAnswers.some(
              (correctAnswer) =>
                userAnswerText &&
                correctAnswer.toLowerCase().trim() ===
                  userAnswerText.toLowerCase().trim()
            );
            console.log("  Тип питання: Текст, isCorrect:", isCorrect); // Лог для текстових питань
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

          console.log("  Результат isCorrect для питання:", isCorrect); // Загальний результат isCorrect

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

  const goHomeButton = document.getElementById("go-home-button"); // Отримуємо кнопку "На головну сторінку"

  goHomeButton.addEventListener("click", () => {
    window.location.href = "index.html"; // Перенаправлення на головну сторінку при кліку на кнопку
  });

  loadQuestionnaire(); // Викликаємо функцію завантаження опитувальника при завантаженні сторінки
});
