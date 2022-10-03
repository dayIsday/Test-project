const buttonNext = document.getElementById('button-next');
const buttonPrev = document.getElementById('button-prev');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal__title');
const modalDesc = document.getElementById('modal__desc');
const buttonModalClose = document.getElementById('modal__close');
const overlay = document.getElementById('overlay');
const dummy = document.getElementById('dummy');

/**
 * Объект состояний
 */
const state = {
  currentSlide: 0,
  countLoadedSlides: 0,
  countTotalSlides: Infinity,
  slides: [],
  countSlidesPerLoad: 3,
  isLoading: false,
};

/**
 * Коллекция классов
 */
const classNames = {
  slider: 'swiper',
  slide: 'swiper-slide',
  slideTitle: 'swiper-slide__title',
  slideDesc: 'swiper-slide__description',
  like: 'like',
  likeDisabled: 'like--disabled',
  likeIconWrapper: 'like__iconWrapper',
  likeText: 'like__text',
  likeTextPrimary: 'like__text--primary',
  arrowButtonRight: 'arrowButton__right',
  arrowButtonLeft: 'arrowButton__left',
  arrowButtonDisabled: 'arrowButton__disabled',
  modalOpened: 'modal--opened',
  overlayOpened: 'overlay--opened',
  dummyOpened: 'dummy--opened',
}

/**
 * Объект слайдера
 */
let slider = null;

/**
 * Доступные URL
 */
const paths = {
  slides: (offset, limit) => `https://private-anon-7040ab1a39-grchhtml.apiary-mock.com/slides?offset=${offset}&limit=${limit}`,

  like: (slideIdx) => `https://private-anon-7040ab1a39-grchhtml.apiary-mock.com/slides/${slideIdx}/like`
};

/**
 * Получает слайды с сервера
 * @param offset {number} — смещение на получение элементов
 * @param limit {number} — ограничение количества элементов
 */
async function requestSlides(offset = 0, limit = 3) {
  return (await fetch(paths.slides(offset + 1, limit))).json();
}

/**
 * Ставит лайк на слайд по индексу
 * @param slideIdx {number} — индекс слайда, которому требуется поставить лайк
 */
async function requestLike(slideIdx) {
  return (await fetch(paths.like(slideIdx), {
    method: 'POST'
  })).json();
}

/**
 * Единый объект для серверных методов
 */
const api = {
  requestSlides,
  requestLike,
};

/**
 * Загружаем новые слайды
 */
function loadSlides() {
  state.isLoading = true;

  api.requestSlides(state.currentSlide, state.countSlidesPerLoad)
    .then((data) => {
      state.slides = [...state.slides, ...data.data];
      state.countLoadedSlides += data.data.length;
      state.countTotalSlides = data.countAll;
      appendSlidesToSlider(data.data);
      closeDummy();
    })
    .catch((e) => console.error(e))
    .finally(() => {
      state.isLoading = false;
    })
}

/**
 * Создаем и заполняем разметку слайда
 */
function createSlide(data) {
  const likeCnt = getLikesFromLocalStorage(data.id);

  const wrapper = document.createElement('div');
  wrapper.classList.add(classNames.slide)

  // Если картинка не передается — вставляем заглушку
  if (data.imgUrl) {
    wrapper.style.backgroundImage = `url(${data.imgUrl})`;
  } else {
    wrapper.style.backgroundImage = `url('./imgs/image-not-found.png')`;
  }

  const title = document.createElement('h2');
  title.classList.add(classNames.slideTitle);
  title.innerText = data.title;

  const desc = document.createElement('p');
  desc.classList.add(classNames.slideDesc);
  desc.innerText = data.desc;
  desc.title = data.desc;

  const like = document.createElement('div');
  like.classList.add(classNames.like);
  likeCnt && like.classList.add(classNames.likeDisabled);

  const iconWrapper = document.createElement('div');
  iconWrapper.classList.add(classNames.likeIconWrapper);
  iconWrapper.onclick = handleLikeButtonClick.bind({}, data.id);

  const likeIcon = document.createElement('img');
  likeIcon.src = './icons/like.svg';
  likeIcon.alt = 'like button icon';

  const likeText = document.createElement('p');
  likeText.classList.add(classNames.likeText);
  likeText.innerText = 'like: ';

  const likeTextPrimary = document.createElement('span');

  likeTextPrimary.classList.add(classNames.likeTextPrimary);
  likeTextPrimary.innerText = likeCnt || data.likeCnt;

  iconWrapper.appendChild(likeIcon);

  likeText.appendChild(likeTextPrimary);

  like.appendChild(iconWrapper);
  like.appendChild(likeText);

  wrapper.appendChild(title);
  wrapper.appendChild(desc);
  wrapper.appendChild(like);

  return wrapper;
}

/**
 * Добавляет новые слайды в слайдер
 * @param data {array}
 */
function appendSlidesToSlider(data) {
  const slides = [];

  for (const item of data) {
    const slide = createSlide(item);
    slides.push(slide);
  }

  slider.appendSlide(slides);
}

/**
 * Обрабатываем нажатие на кнопку следующего слайда
 */
function handleNextSlide() {
  // Предотвращаем переключение слайда, если текущий индекс больше максимального,
  // или если происходит загрузка слайдов
  if (state.isLoading || state.currentSlide >= state.countTotalSlides) return;

  state.currentSlide += 1;

  // Если слайды из числа загруженных закончились — подгружаем новые
  // Начинаем подгрузку на один слайд заранее
  if (
    state.currentSlide < state.countTotalSlides &&
    state.currentSlide >= state.countLoadedSlides - 1
  ) {
    loadSlides();
  }

  updateButtonStyle();
}

/**
 * Обрабатываем нажатие на кнопку предыдущего слайда
 */
function handlePrevSlide() {
  if (state.currentSlide <= 0) return;
  state.currentSlide -= 1;

  updateButtonStyle();
}

/**
 * Обновляем стили кнопок перелистывания слайдов
 */
function updateButtonStyle() {
  switch (state.currentSlide) {
    case 0: {
      disableArrowButton(buttonPrev);
      break;
    }

    case state.countTotalSlides - 1: {
      disableArrowButton(buttonNext);
      break;
    }

    default: {
      enableArrowButton(buttonPrev);
      enableArrowButton(buttonNext);
    }
  }
}

/**
 * Добавляем стили отключения кнопки
 */
function disableArrowButton(button) {
  button.classList.add(classNames.arrowButtonDisabled);
}

/**
 * Удаляем стили отключения кнопки
 */
function enableArrowButton(button) {
  button.classList.remove(classNames.arrowButtonDisabled);
}

/**
 * Обрабатываем нажатие на кнопку лайка
 */
function handleLikeButtonClick(slideIdx) {
  api.requestLike(slideIdx)
    .then((data) => {
      openModal(data);
      addLike(slideIdx);
      saveLikeToLocalStorage(slideIdx, state.slides[slideIdx].likeCnt);
      disableLikeButton(slideIdx);
    });
}

/**
 * Увеличиваем значение лайков для слайда
 */
function addLike(slideIdx) {
  const likeText = document.getElementsByClassName(classNames.likeTextPrimary)[slideIdx];
  const likeCnt = state.slides[slideIdx].likeCnt + 1;
  state.slides[slideIdx].likeCnt = likeCnt;
  likeText.innerText = likeCnt;
}

/**
 * Сохраняем слайды в локальное хранилище
 * @param slideIdx {number} — идентификатор слайда
 * @param likeCnt {number} — количество лайков
 */
function saveLikeToLocalStorage(slideIdx, likeCnt) {
  const likedSlides = JSON.parse(localStorage.getItem('likedSlides')) || [];
  likedSlides[slideIdx] = likeCnt;

  localStorage.setItem('likedSlides', JSON.stringify(likedSlides));
}

/**
 * Возвращаем текущее количество лайков для слайда
 * @param slideIdx {number} — идентификатор слайда
 */
function getLikesFromLocalStorage(slideIdx) {
  const likedSlides = JSON.parse(localStorage.getItem('likedSlides')) || [];
  return likedSlides[slideIdx];
}

/**
 * Отключаем кнопку лайка
 * @param slideIdx {number} — идентификатор слайда
 */
function disableLikeButton(slideIdx) {
  const likeButton = document.getElementsByClassName('like')[slideIdx];
  likeButton.classList.add(classNames.likeDisabled);
}

/**
 * Открываем модальное окно
 */
function openModal(data) {
  modalTitle.innerText = data.title;
  modalDesc.innerText = data.desc;

  modal.classList.add(classNames.modalOpened);
  overlay.classList.add(classNames.overlayOpened);
}

/**
 * Закрываем модальное окно
 */
function closeModal() {
  modal.classList.remove(classNames.modalOpened);
  overlay.classList.remove(classNames.overlayOpened);
}

/**
 * Убираем заглушку после загрузки слайдов
 */
function closeDummy() {
  dummy.classList.remove(classNames.dummyOpened);
}

/**
 * Обработка событий после полной загрузки страницы
 */
function handlePageLoad() {
  loadSlides();
}

/**
 * Подписываемся на события
 */
function initEvents() {
  window.addEventListener('load', handlePageLoad);
  buttonNext.addEventListener('click', handleNextSlide);
  buttonPrev.addEventListener('click', handlePrevSlide);
  buttonModalClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
}

/**
 * Инициализируем слайдер
 */
function initSlider() {
  slider = new Swiper(`.${classNames.slider}`, {
    direction: 'horizontal',
    simulateTouch: false,

    navigation: {
      nextEl: `.${classNames.arrowButtonRight}`,
      prevEl: `.${classNames.arrowButtonLeft}`,
    },
  });
}

/**
 * Единая стартовая точка проекта
 */
function init() {
  initSlider();
  initEvents();
}

init();
