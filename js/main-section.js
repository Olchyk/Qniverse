document.addEventListener("DOMContentLoaded", () => {
  const heroSection = document.querySelector(".hero");
  heroSection.style.display = "none";

  let currentPage = 1;
  const limit = 5;

  let paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.classList.add("pagination-container");
    document.body.appendChild(paginationContainer);
  }

  heroSection.after(paginationContainer);

  function fetchQuestionnaires(page = 1) {
    heroSection.innerHTML = "<p>Завантаження...</p>";

    fetch(
      `http://localhost:3000/api/questionnaires-with-counts?page=${page}&limit=${limit}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("Отримані дані від сервера:", data);

        // **Оновлена перевірка отриманих даних**
        if (!Array.isArray(data)) {
          console.error("Некоректні дані від сервера (очікував масив):", data);
          heroSection.innerHTML = "<p>Помилка отримання опитувальників.</p>";
          paginationContainer.innerHTML = "";
          return;
        }

        heroSection.innerHTML = ""; // Очищаємо після отримання

        if (data.length === 0) {
          heroSection.innerHTML =
            "<p>Наразі немає доступних опитувальників.</p>";
          paginationContainer.innerHTML = "";
          return;
        }

        data.forEach((questionnaire, index) => {
          const quizContainer = document.createElement("div");
          quizContainer.classList.add("quiz-container");

          const quizCard = document.createElement("div");
          quizCard.classList.add("quiz-card");
          quizCard.dataset.questionnaireId = questionnaire.id;

          const quizCardItem = document.createElement("div");
          quizCardItem.classList.add("quiz-card-item");
          quizCardItem.innerHTML = `
            <h3>${questionnaire.title}</h3>
            <p>${questionnaire.description || "Опису немає"}</p>
            <p><strong>Кількість питань:</strong> ${
              questionnaire.questionsCount
            }</p>
          `;

          const quizButton = document.createElement("div");
          quizButton.classList.add("quiz-button");
          quizButton.innerHTML = `<span class="menu-icon" data-menu="menu${
            index + 1
          }">⋮</span>`;

          const dropdownMenu = document.createElement("div");
          dropdownMenu.classList.add("dropdown-menu");
          dropdownMenu.id = `menu${index + 1}`;
          dropdownMenu.innerHTML = `
            <ul>
              <li data-action="edit" data-id="${questionnaire.id}">Редагувати</li>
              <li data-action="run" data-id="${questionnaire.id}">Запустити</li>
              <li data-action="delete" data-id="${questionnaire.id}">Видалити</li>
            </ul>
          `;

          quizCard.appendChild(quizCardItem);
          quizCard.appendChild(quizButton);
          quizCard.appendChild(dropdownMenu);
          quizContainer.appendChild(quizCard);
          heroSection.appendChild(quizContainer);
        });

        attachMenuEventListeners();
      })
      .catch((error) => {
        console.error("Помилка отримання опитувальників:", error);
        heroSection.innerHTML = "<p>Помилка завантаження опитувальників.</p>";
      });
  }

  function setupPagination(totalPages, currentPage) {
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = ""; // Очищуємо попередню пагінацію

    if (!totalPages || totalPages <= 1) return; // Якщо сторінка одна, не показуємо

    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement("button");
      pageButton.textContent = i;
      pageButton.classList.add("pagination-button");

      if (i === currentPage) {
        pageButton.classList.add("active");
      }

      pageButton.addEventListener("click", () => {
        fetchQuestionnaires(i);
      });
      paginationContainer.appendChild(pageButton);
    }
  }

  fetchQuestionnaires();

  function attachMenuEventListeners() {
    document.querySelectorAll(".menu-icon").forEach((icon) => {
      icon.addEventListener("click", function (event) {
        event.stopPropagation();

        let menuId = this.getAttribute("data-menu");
        let menu = document.getElementById(menuId);

        document.querySelectorAll(".dropdown-menu").forEach((m) => {
          if (m !== menu) {
            m.classList.remove("menu-visible");
          }
        });

        menu.classList.toggle("menu-visible");
      });
    });

    document.addEventListener("click", function () {
      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        menu.classList.remove("menu-visible");
      });
    });

    document.querySelectorAll(".dropdown-menu ul").forEach((menuList) => {
      menuList.addEventListener("click", function (event) {
        const target = event.target;
        if (target.tagName === "LI") {
          const action = target.getAttribute("data-action");
          const questionnaireId = target.getAttribute("data-id");

          if (action === "edit") {
            window.location.href = `edit-questionnaire.html?id=${questionnaireId}`;
          } else if (action === "run") {
            window.location.href = `run-questionnaire.html?id=${questionnaireId}`;
          } else if (action === "delete") {
            handleDeleteQuestionnaire(questionnaireId);
          }
        }
      });
    });
  }

  fetchQuestionnaires();

  fetch("http://localhost:3000/api/questionnaires-with-counts")
    .then((response) => response.json())
    .then((questionnaires) => {
      heroSection.innerHTML = "";
      if (questionnaires && questionnaires.length > 0) {
        questionnaires.forEach((questionnaire, index) => {
          const quizContainer = document.createElement("div");
          quizContainer.classList.add("quiz-container");

          const quizCard = document.createElement("div");
          quizCard.classList.add("quiz-card");
          quizCard.dataset.questionnaireId = questionnaire.id;

          const quizCardItem = document.createElement("div");
          quizCardItem.classList.add("quiz-card-item");
          quizCardItem.innerHTML = `
              <h3>${questionnaire.title}</h3>
              <p>${questionnaire.description || "Опису немає"}</p>
              <p><strong>Questions:</strong> ${questionnaire.questionsCount}</p>
          `;

          const quizButton = document.createElement("div");
          quizButton.classList.add("quiz-button");
          quizButton.innerHTML = `<span class="menu-icon" data-menu="menu${
            index + 1
          }">⋮</span>`;

          const dropdownMenu = document.createElement("div");
          dropdownMenu.classList.add("dropdown-menu");
          dropdownMenu.id = `menu${index + 1}`;
          dropdownMenu.innerHTML = `
              <ul>
                  <li>Edit</li>
                  <li>Run</li>
                  <li>Delete</li>
              </ul>
          `;

          quizCard.appendChild(quizCardItem);
          quizCard.appendChild(quizButton);
          quizCard.appendChild(dropdownMenu);
          quizContainer.appendChild(quizCard);
          heroSection.appendChild(quizContainer);
        });

        attachMenuEventListeners();
      } else {
        heroSection.innerHTML = "<p>Опитувальники відсутні.</p>";
      }

      heroSection.style.display = "block"; // Показуємо контент після завантаження
    })
    .catch((error) => {
      console.error("Помилка завантаження:", error);
      heroSection.innerHTML = "<p>Помилка завантаження опитувальників.</p>";
      heroSection.style.display = "block";
    });
});

function attachMenuEventListeners() {
  document.querySelectorAll(".menu-icon").forEach((icon) => {
    icon.addEventListener("click", function (event) {
      event.stopPropagation();

      let menuId = this.getAttribute("data-menu");
      let menu = document.getElementById(menuId);

      document.querySelectorAll(".dropdown-menu").forEach((m) => {
        if (m !== menu) {
          m.classList.remove("menu-visible");
        }
      });

      menu.classList.toggle("menu-visible");
    });
  });

  document.addEventListener("click", function () {
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("menu-visible");
    });
  });

  // Додаємо обробники для кнопок "Edit", "Run", "Delete" в кожному випадаючому меню
  document.querySelectorAll(".dropdown-menu ul").forEach((menuList) => {
    const questionnaireCard = menuList.closest(".quiz-container"); // Знаходимо батьківську картку опитувальника
    const questionnaireId =
      questionnaireCard.querySelector(".quiz-card").dataset.questionnaireId; // Отримуємо ID з data-атрибута

    menuList.addEventListener("click", function (event) {
      const target = event.target;

      if (target.tagName === "LI") {
        const action = target.textContent;

        if (action === "Edit") {
          const editUrl = `edit-questionnaire.html?id=${questionnaireId}`;
          window.location.href = editUrl;
        } else if (action === "Run") {
          const runUrl = `run-questionnaire.html?id=${questionnaireId}`;
          window.location.href = runUrl;
        } else if (action === "Delete") {
          handleDeleteQuestionnaire(questionnaireId, questionnaireCard); // Викликаємо функцію для видалення
        }

        // Закриваємо меню після вибору дії
        menuList.closest(".dropdown-menu").classList.remove("menu-visible");
      }
    });
  });
}

function handleDeleteQuestionnaire(questionnaireId, questionnaireCard) {
  if (confirm("Ви впевнені, що хочете видалити цей опитувальник?")) {
    fetch(`http://localhost:3000/api/questionnaires/${questionnaireId}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          console.log(
            `Questionnaire ID ${questionnaireId} deleted successfully.`
          );
          questionnaireCard.remove(); // Видаляємо картку опитувальника з DOM
          // Можна оновити список опитувальників повністю, або просто видалити картку з DOM
        } else {
          console.error("Failed to delete questionnaire.");
          alert("Помилка видалення опитувальника.");
        }
      })
      .catch((error) => {
        console.error("Error deleting questionnaire:", error);
        alert("Помилка видалення опитувальника.");
      });
  }
}
