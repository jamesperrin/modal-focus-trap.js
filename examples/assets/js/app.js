const AppCommon = {};

  /**
   * @description Handles creating required abbr element.
   * @param {HTMLLabelElement} HTML label element
   */

AppCommon.HandleRequiredFormLabels = function (label) {
  if (label && !!label.innerText) {
    if (!label.querySelector('abbr.error')) {
      const abbr = document.createElement('abbr');
      abbr.classList.add('error');
      abbr.title = 'required';
      abbr.innerText = '*';
      label.append(abbr);
    }
  }
};

/**
 * @description Displays a red asterisk near label for required form fields.
 */
AppCommon.HandleRequiredFormFields = function () {
  if (document.querySelector('form')) {
    document.querySelectorAll('input,select,textarea').forEach(function (el) {
      if (el.hasAttribute('data-val-required') || el.hasAttribute('required')) {
        const label = document.querySelector(
          `label:not(.custom-control-label)[for="${el.id}"],label:not(.usa-checkbox__label)[for="${el.id}"]`,
        );
        AppCommon.HandleRequiredFormLabels(label);
      }
    });
  }
};

function handleDisablingFocusTrap() {
  const button = document.querySelector('#DisableBtn');
  button.addEventListener('click', function () {
      isTrapEnabled = !isTrapEnabled;

      if (isTrapEnabled) {
          button.classList.remove('btn-success');
          button.classList.add('btn-danger');
          button.textContent = 'Disable focus trap';
          button.title = 'Disable focus trap';
      } else {
          button.classList.remove('btn-danger');
          button.classList.add('btn-success');
          button.textContent = 'Enable focus trap';
          button.title = 'Enable focus trap';
      }
  });
}

/**
 * @description Calls AppCommonJsHandler IIFE
 */
(function AppCommonJsHandler() {
  document.addEventListener('DOMContentLoaded', function () {
    AppCommon.HandleRequiredFormFields();
    handleDisablingFocusTrap();
  });
})();
