/**
 * @name modal-focustrap.js
 * @description Handles trapping focus within an open modal, and returns focus back to element triggering modal.
 * @author James Perrin, @jamesperrin | https://github.com/jamesperrin
 * @license Licensed under CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * @see http://web-accessibility.carnegiemuseums.org/code/dialogs/
 * @see https://uxmovement.com/forms/best-practices-for-modal-windows/
 * @see https://accessibleweb.com/question-answer/where-should-keyboard-focus-go-in-modals/
 * @see https://www.bennadel.com/blog/4097-restoring-activeelement-focus-after-a-user-interaction-in-javascript.htm
 *
 */

'use strict';

/**
 * Source: Bootstrap dom/selector-engine.js
 * @see https://github.com/twbs/bootstrap/blob/main/js/src/dom/selector-engine.js
 */
const SelectorEngine = {
  isDisabled(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }
    if (element.classList.contains('disabled')) {
      return true;
    }
    if (typeof element.disabled !== 'undefined') {
      return element.disabled;
    }
    return element.hasAttribute('disabled') && element.getAttribute('disabled') !== 'false';
  },
  isJQueryElement(object) {
    return this.isElement(object) && typeof object.jquery !== 'undefined';
  },
  isElement(object) {
    if (!object || typeof object !== 'object') {
      return false;
    }
    if (typeof object.jquery !== 'undefined') {
      object = object[0];
    }
    return typeof object.nodeType !== 'undefined';
  },
  isVisible(element) {
    if (!this.isElement(element) || element.getClientRects().length === 0) {
      return false;
    }
    const elementIsVisible = getComputedStyle(element).getPropertyValue('visibility') === 'visible';

    // Handle `details` element as its content may falsie appear visible when it is closed
    const closedDetails = element.closest('details:not([open])');

    if (!closedDetails) {
      return elementIsVisible;
    }

    if (closedDetails !== element) {
      const summary = element.closest('summary');
      if (summary && summary.parentNode !== closedDetails) {
        return false;
      }
      if (summary === null) {
        return false;
      }
    }
    return elementIsVisible;
  },
  find(selector, element = document.documentElement) {
    return [].concat(...Element.prototype.querySelectorAll.call(element, selector));
  },
  focusableChildren(element) {
    const focusables = [
      'a',
      'button',
      'input',
      'textarea',
      'select',
      'details',
      '[tabindex]',
      '[contenteditable="true"]',
    ]
      .map((selector) => `${selector}:not([tabindex^="-"])`)
      .join(',');
    return this.find(focusables, element).filter((el) => !this.isDisabled(el) && this.isVisible(el));
  },
};

/**
 * @description Handles trapping focus within an open modal, and returns focus back to element triggering modal.
 *
 */
const ModalFocusTrap = new (function () {
  let previousElement = null;

  /**
   * @description Traps focus within an open modal.
   * @param {(String|HTMLElement)} targetModal - Must be a valid CSS selector string, or a DOM reference to modal element.
   *
   * @example
   *
   *     ModalFocusTrap.TrapFocus('.modal'); -- Using CSS Selector
   *     ModalFocusTrap.TrapFocus(document.querySelector('.modal')); -- Using DOM Selector
   *     ModalFocusTrap.TrapFocus($('.modal')); -- Using jQuery CSS Selector
   *
   *     Note: Bootstrap "shown.bs.modal" Event, "this" is a reference to the modal element
   *
   *     --- Bootstrap 4
   *     $('.modal').on('shown.bs.modal', function () {
   *       ModalFocusTrap.TrapFocus(this);
   *     });
   *
   *     --- Bootstrap 5 and later
   *     document.querySelector('.modal').addEventListener('shown.bs.modal', function () {
   *       ModalFocusTrap.TrapFocus(this);
   *     });
   *
   * @return {void}
   */
  this.TrapFocus = function (targetModal) {
    if (typeof targetModal === 'string' && !SelectorEngine.isElement(targetModal)) {
      targetModal = document.querySelector(targetModal);
    }

    if (SelectorEngine.isJQueryElement(targetModal)) {
      targetModal = targetModal[0];
    }

    if (!targetModal && !SelectorEngine.isElement(targetModal)) {
      alert(
        'ERROR: \n\nModalFocusTrap TrapFocus function parameter needs to be a CSS selector string, or DOM reference to modal element.',
      );

      console.error('Parameter needs to be a CSS selector string, or DOM reference to modal element.');

      return;
    }

    const TAB_KEY = 'Tab';
    const elements = SelectorEngine.focusableChildren(targetModal);
    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    firstElement.focus();

    firstElement.addEventListener('keydown', function (event) {
      if (event.key == TAB_KEY && event.shiftKey) {
        event.preventDefault();
        lastElement.focus();
      }
    });

    lastElement.addEventListener('keydown', function (event) {
      if (event.key == TAB_KEY && !event.shiftKey) {
        event.preventDefault();
        firstElement.focus();
      }
    });
  };

  /**
   * @description Handles setting the previousElement from SetFocusTarget.
   *
   * @return {void}
   */
  function SetPreviousElement() {
    previousElement = document.activeElement || document.body;
  }

  /**
   * @description Handles setting the focus back to element that triggered modal.
   * @param {(String|HTMLElement[])} focusTargetElements - Must be a valid CSS selector string, or DOM references to modal trigger elements.
   *
   * @example
   *
   *     ModalFocusTrap.SetFocusTarget('.modal--trigger button'); -- Using CSS Selector
   *     ModalFocusTrap.SetFocusTarget('button.modal--trigger'); -- Using CSS Selector
   *     ModalFocusTrap.SetFocusTarget(document.querySelectorAll('button.modal--trigger')); -- Using DOM Selector
   *     ModalFocusTrap.SetFocusTarget($('button.modal--trigger')); -- Using jQuery CSS Selector
   *
   * @return {void}
   */
  this.SetFocusTargets = function (focusTargetElements) {
    if (typeof focusTargetElements === 'string' && !SelectorEngine.isElement(focusTargetElements)) {
      focusTargetElements = document.querySelectorAll(focusTargetElements);
    }

    if (!focusTargetElements && !SelectorEngine.isElement(focusTargetElements)) {
      alert(
        'ERROR: \n\nModalFocusTrap SetFocusTarget function parameter needs to be a String or DOM reference to element trigging Modal.',
      );

      console.error('Parameter needs to be a String or DOM reference to element trigging Modal.');

      return;
    }

    if (SelectorEngine.isJQueryElement(focusTargetElements)) {
      focusTargetElements = Array.from(focusTargetElements);
    }

    focusTargetElements.forEach(function (el) {
      el.addEventListener('click', SetPreviousElement);
    });
  };

  /**
   * @description Returns focus back to element that triggered modal.
   *
   * @example
   *
   *    ModalFocusTrap.ReleaseFocus();
   *
   * @return {void}
   */
  this.ReleaseFocus = function () {
    if (previousElement) {
      previousElement.focus();
      previousElement = null;
    }
  };
})();

// We freeze the object to prevent new properties being added and existing properties being modified or removed
Object.freeze(SelectorEngine);
Object.freeze(ModalFocusTrap);
