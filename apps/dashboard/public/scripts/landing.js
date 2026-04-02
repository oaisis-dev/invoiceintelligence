/* Landing page JS — ported from website-invoice-intelligence/build/main.js
 * Changes from original:
 * 1. Wrapped in initLanding() for React re-initialization
 * 2. Contact form API URL: /api/contact → /api/marketing/contact
 * 3. startCheckout() → direct redirect to /sign-up (no checkout modal)
 */

var _landingInitialized = false;
var _scrollHandler = null;
var _revealObserver = null;

function initLanding() {
  /* Prevent duplicate listeners on re-init */
  if (_scrollHandler) {
    window.removeEventListener('scroll', _scrollHandler);
    _scrollHandler = null;
  }
  if (_revealObserver) {
    _revealObserver.disconnect();
    _revealObserver = null;
  }

  /* ===== NAVBAR SCROLL ===== */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    _scrollHandler = () => { navbar.classList.toggle('scrolled', window.scrollY > 20); };
    window.addEventListener('scroll', _scrollHandler);
  }

  /* ===== MOBILE MENU ===== */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu && !menuBtn._bound) {
    menuBtn._bound = true;
    menuBtn.addEventListener('click', () => { menuBtn.classList.toggle('active'); mobileMenu.classList.toggle('hidden'); });
    document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', () => { menuBtn.classList.remove('active'); mobileMenu.classList.add('hidden'); }));
  }

  /* ===== SCROLL REVEAL ===== */
  _revealObserver = new IntersectionObserver((e) => { e.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); }); }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => _revealObserver.observe(el));

  /* ===== ANALYTICS (GA4 gtag) ===== */
  document.querySelectorAll('[data-gtag-event]').forEach(el => {
    if (el._gtagBound) return;
    el._gtagBound = true;
    el.addEventListener('click', () => {
      trackEvent(el.dataset.gtagEvent, {
        cta_label: el.dataset.gtagLabel || undefined,
        cta_location: el.dataset.gtagLocation || undefined,
        cta_target: el.dataset.gtagTarget || undefined,
        cta_text: (el.textContent || '').trim() || undefined,
      });
    });
  });

  /* ===== MODAL CLICK-OUTSIDE ===== */
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    if (backdrop._modalBound) return;
    backdrop._modalBound = true;
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });
}

/* ===== GLOBAL FUNCTIONS (called from onclick handlers) ===== */

function trackEvent(eventName, params) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params || {});
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item'), ans = item.querySelector('.faq-answer'), chev = item.querySelector('.faq-chevron'), isOpen = ans.classList.contains('open');
  document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-chevron').forEach(c => c.classList.remove('open'));
  if (!isOpen) { ans.classList.add('open'); chev.classList.add('open'); }
}

function startCheckout(tier) {
  trackEvent('begin_checkout', { currency: 'USD', tier: tier || 'free' });
  try { sessionStorage.setItem('selected_plan_tier', tier || 'free'); } catch (e) { /* private browsing */ }
  window.location.href = '/sign-up';
}

/* ===== MODAL SYSTEM ===== */
var activeModal = null;
var previousFocus = null;

function openModal(id) {
  var modal = document.getElementById(id);
  if (!modal) return;
  previousFocus = document.activeElement;
  activeModal = modal;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (id === 'contactModal') {
    var contactForm = document.getElementById('contactForm');
    var contactSuccess = document.getElementById('contactSuccess');
    if (contactForm) contactForm.classList.remove('hidden');
    if (contactSuccess) contactSuccess.classList.add('hidden');
    clearFormErrors();
    var contactSubmit = document.getElementById('cf-submit');
    if (contactSubmit) {
      contactSubmit.disabled = false;
      contactSubmit.textContent = 'Submit';
    }
  }

  requestAnimationFrame(function() {
    var closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  });
}

function closeModal(id) {
  var modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
  activeModal = null;
  if (previousFocus) previousFocus.focus();
  previousFocus = null;
}

// Escape key + focus trap
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && activeModal) {
    closeModal(activeModal.id);
  }
  if (e.key === 'Tab' && activeModal) {
    var focusable = activeModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
});

/* ===== CONTACT FORM ===== */
function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(function(el) { el.classList.remove('visible'); });
  document.querySelectorAll('.form-input').forEach(function(el) { el.classList.remove('error'); });
}

function submitContact() {
  clearFormErrors();
  var name = document.getElementById('cf-name');
  var biz = document.getElementById('cf-biz');
  var email = document.getElementById('cf-email');
  var msg = document.getElementById('cf-msg');
  var demo = document.getElementById('cf-demo');
  var valid = true;

  if (!name.value.trim()) {
    name.classList.add('error');
    document.getElementById('cf-name-err').classList.add('visible');
    valid = false;
  }
  if (!biz.value.trim()) {
    biz.classList.add('error');
    document.getElementById('cf-biz-err').classList.add('visible');
    valid = false;
  }
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
    email.classList.add('error');
    document.getElementById('cf-email-err').classList.add('visible');
    valid = false;
  }

  if (!valid) {
    var firstErr = document.querySelector('.form-input.error');
    if (firstErr) firstErr.focus();
    return;
  }

  trackEvent('form_submit', {
    form_id: 'contact_form',
    form_location: 'contact_modal',
    demo_requested: demo.checked,
  });

  var submitBtn = document.getElementById('cf-submit');
  var submitErr = document.getElementById('cf-submit-err');
  submitErr.classList.remove('visible');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending\u2026';

  var apiUrl = '/api/marketing/contact';
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.value.trim(),
      businessName: biz.value.trim(),
      email: email.value.trim(),
      message: msg.value.trim(),
      demoRequested: demo.checked,
    }),
  })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (body) { throw new Error(body && body.error || 'Send failed'); });
      return res.json();
    })
    .then(function () {
      document.getElementById('contactForm').classList.add('hidden');
      document.getElementById('contactSuccess').classList.remove('hidden');
      name.value = '';
      biz.value = '';
      email.value = '';
      msg.value = '';
      demo.checked = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    })
    .catch(function () {
      submitErr.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    });
}

/* ===== INIT ===== */
initLanding();
window.addEventListener('landing:init', initLanding);
