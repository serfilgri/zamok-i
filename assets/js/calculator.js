// Калькулятор стоимости
(function() {
  const calculator = {
    service: null,
    lock: null,
    district: null,
    
    init() {
      this.bindEvents();
    },
    
    bindEvents() {
      // Обработчики для всех кнопок
      document.querySelectorAll('.calculator__option').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleOptionClick(e));
      });
    },
    
    handleOptionClick(e) {
      const btn = e.currentTarget;
      const step = btn.closest('.calculator__step');
      
      // Убираем active у всех кнопок в этом шаге
      step.querySelectorAll('.calculator__option').forEach(b => {
        b.classList.remove('active');
      });
      
      // Добавляем active к выбранной кнопке
      btn.classList.add('active');
      
      // Сохраняем выбор
      if (btn.dataset.service) {
        this.service = {
          type: btn.dataset.service,
          price: parseInt(btn.dataset.price)
        };
      } else if (btn.dataset.lock) {
        this.lock = {
          type: btn.dataset.lock,
          price: parseInt(btn.dataset.price)
        };
      } else if (btn.dataset.district) {
        this.district = {
          type: btn.dataset.district,
          price: parseInt(btn.dataset.price)
        };
      }
      
      // Пересчитываем
      this.calculate();
    },
    
    calculate() {
      if (!this.service || !this.lock || !this.district) {
        return;
      }
      
      const total = this.service.price + this.lock.price + this.district.price;
      const resultElement = document.getElementById('resultPrice');
      
      // Анимация изменения цены
      resultElement.style.opacity = '0.5';
      
      setTimeout(() => {
        resultElement.textContent = `от ${total.toLocaleString('ru-RU')} ₽`;
        resultElement.style.opacity = '1';
      }, 150);
    }
  };
  
  // Инициализация при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => calculator.init());
  } else {
    calculator.init();
  }
})();
