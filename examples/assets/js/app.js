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
  const form = document.querySelector('form');

  if (!form) {
    return;
  }

  document.querySelectorAll('input,select,textarea').forEach(function (el) {
    if (el.hasAttribute('data-val-required') || el.hasAttribute('required')) {
      const label = document.querySelector(
        `label:not(.custom-control-label)[for="${el.id}"],label:not(.usa-checkbox__label)[for="${el.id}"]`,
      );
      AppCommon.HandleRequiredFormLabels(label);
    }
  });
};

/**
 * @description Calls AppCommonJsHandler IIFE
 */
(function AppCommonJsHandler() {
  document.addEventListener('DOMContentLoaded', function () {
    AppCommon.HandleRequiredFormFields();
  });
})();
