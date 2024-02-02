/**
 * @name modal-focus-trap.js
 * @version 1.0.0.0
 * @description VanillaJS library for trapping focus within an opened Modal, and returning focus back to the element triggering Modal.
 * @author James Perrin, @jamesperrin | https://github.com/jamesperrin
 * @license Licensed under CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
 * @souce https://github.com/jamesperrin/modal-focus-trap.js
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
      'audio[controls]',
      'button',
      'details',
      'input',
      'select',
      'textarea',
      'video[controls]',
      '[tabindex]',
      '[contenteditable="true"]',
    ]
      .map((selector) => `${selector}:not([tabindex^="-"])`)
      .join(',');
    return this.find(focusables, element).filter((el) => !this.isDisabled(el) && this.isVisible(el));
  },
  isJQueryElement(object) {
    return this.isElement(object) && typeof object.jquery !== 'undefined';
  },
  isArray(object) {
    return object && typeof object === 'object' && Array.isArray(object);
  },
  isNodeList(object) {
    return (
      object && typeof object === 'object' && NodeList.prototype.isPrototypeOf(object) && object instanceof NodeList
    );
  },
  queryElement(element) {
    if (typeof element === 'string' && !this.isElement(element)) {
      return document.querySelector(element);
    }
    if (this.isJQueryElement(element)) {
      return element[0];
    }
    if (this.isElement(element)) {
      return element;
    }
    return null;
  },
  queryElementAll(element) {
    if (typeof element === 'string' && !this.isElement(element)) {
      return document.querySelectorAll(element);
    }
    if (this.isJQueryElement(element)) {
      return Array.from(element);
    }
    if (this.isArray(element) || this.isNodeList(element)) {
      return element;
    }
    return null;
  },
};

/**
 * @description Handles trapping focus within an opened Modal, and returning focus back to the element triggering Modal.
 *
 */
const ModalFocusTrap = new (function () {
  let triggerTarget = null;

  /**
   * @description Method invoked to retrieve reference to the element triggering Modal.
   * @param {Event} event Reference to an object containing information about the action that just happened.
   *
   * @returns {HTMLElement}
   */
  function GetTriggerTarget(event) {
    /*
      NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
        shadow host. However, event.target.composedPath() will be an array of
        nodes "clicked" from inner-most (the actual element inside the shadow) to
        outer-most (the host HTML document). If we have access to composedPath(),
        then use its first element; otherwise, fall back to event.target (and
        this only works for an _open_ shadow DOM; otherwise,
        composedPath()[0] === event.target always).

        See: https://github.com/focus-trap/focus-trap/blob/master/index.js#L98
      */
    return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
  }

  /**
   * @description Method invoked before a Modal is created and opened.
   * Creates an addEventListener for all elements that can trigger Modal.
   * The addEventListener assists with returning focus back to the element triggering Modal.
   *
   * @param {(String|HTMLElement[])} triggerTargets Must be a valid CSS selector String, or DOM references to modal trigger elements.
   *
   * @example
   *
   *     ModalFocusTrap.GetTriggerTargets('.modal--trigger button'); -- Using CSS Selector
   *     ModalFocusTrap.GetTriggerTargets('button.modal--trigger'); -- Using CSS Selector
   *     ModalFocusTrap.GetTriggerTargets(document.querySelectorAll('button.modal--trigger')); -- Using DOM Selector
   *     ModalFocusTrap.GetTriggerTargets($('button.modal--trigger')); -- Using jQuery CSS Selector
   *
   * @return {void}
   */
  this.GetTriggerTargets = function (triggerTargets) {
    triggerTargets = SelectorEngine.queryElementAll(triggerTargets);

    if (!triggerTargets) {
      alert(
        'ERROR: ModalFocusTrap GetTriggerTargets  \n\nFunction parameter needs to be a String or DOM reference to element trigging Modal.',
      );

      console.error('Parameter needs to be a String or DOM reference to element trigging Modal.');

      return;
    }

    triggerTargets.forEach(function (el) {
      el.addEventListener('click', function (event) {
        // Handles setting the variable for the element triggering a Modal.
        triggerTarget = GetTriggerTarget(event);
      });
    });
  };

  /**
   * @description Method invoked when a Modal opens to handle trapping focus within the opened Modal.
   * @param {(String|HTMLElement)} targetModal Must be a valid CSS selector String, or a DOM reference to Modal element.
   *
   * @example
   *
   *     ModalFocusTrap.ActivateTrap(event.target); // -- Using DOM Event Target
   *     ModalFocusTrap.ActivateTrap('.modal'); -- Using CSS Selector
   *     ModalFocusTrap.ActivateTrap(document.querySelector('.modal')); -- Using DOM Selector
   *     ModalFocusTrap.ActivateTrap($('.modal')); -- Using jQuery CSS Selector
   *
   *     Note: Bootstrap "shown.bs.modal" Event, "this" is a reference to Modal element
   *
   *     --- Bootstrap 4
   *     $('.modal').on('shown.bs.modal', function (event) {
   *       ModalFocusTrap.ActivateTrap(event.target);  // -- Using DOM Event Target
   *     });
   *
   *     --- Bootstrap 5 and later
   *     document.querySelector('.modal').addEventListener('shown.bs.modal', function (event) {
   *       ModalFocusTrap.ActivateTrap(event.target);  // -- Using DOM Event Target
   *     });
   *
   * @return {void}
   */
  this.ActivateTrap = function (targetModal) {
    targetModal = SelectorEngine.queryElement(targetModal);

    if (!targetModal) {
      alert(
        'ERROR: ModalFocusTrap ActivateTrap\n\nFunction parameter needs to be a CSS selector String, or DOM reference to Modal element.',
      );

      console.error('Function parameter needs to be a CSS selector String, or DOM reference to Modal element.');

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
   * @description HTML onclick attribute to handle trapping focus within an opened modal, and returning focus back to element triggering Modal.
   * @param {(String|HTMLElement)} targetModal Must be a valid CSS selector String, or a DOM reference to Modal element.
   * @param {HTMLElement} triggerElement Must be a valid CSS selector String, or a DOM reference to Modal element. This element triggering Modal
   * @param {(String)} className [Optional] Must be a CSS classname indicating a Modal or dialog is open e.g show, active, modal--open, etc.
   *
   * @example
   *
   *    <button type="button" title="Add" onclick="ModalFocusTrap.ActivateOnClick('#modal-id', this)">
   *      Add
   *    </button>
   *
   *    <button type="button" title="Add" onclick="ModalFocusTrap.ActivateOnClick('.modal', this, 'show')">
   *      Add
   *    </button>
   *
   * @return {void}
   */
  this.ActivateOnClick = function (targetModal, triggerElement, className) {
    triggerElement = SelectorEngine.queryElement(triggerElement);

    if (!triggerElement) {
      alert(
        'ERROR: ModalFocusTrap ActiveOnClick\n\nParameter triggerElement needs to be a DOM reference to element trigging Modal.',
      );

      console.error('Parameter triggerElement needs to be a DOM reference to element trigging Modal.');

      return;
    }

    const isModal = SelectorEngine.queryElement(targetModal);

    if (!isModal) {
      alert(
        'ERROR: ModalFocusTrap ActiveOnClick\n\nParameter targetModal needs to be a CSS selector String, or DOM reference to Modal element.',
      );

      console.error('Parameter targetModal needs to be a CSS selector String, or DOM reference to Modal element.');

      return;
    }

    triggerTarget = triggerElement;

    const checkInterval = setInterval(function () {
      const hasModal = !className
        ? document.querySelector(`${targetModal}`)
        : document.querySelector(`${targetModal}`).classList.contains(`${className}`);

      const timeout = !className ? 375 : 275;

      if (hasModal) {
        clearInterval(checkInterval);
        setTimeout(function () {
          ModalFocusTrap.ActivateTrap(targetModal);
        }, timeout);
      }
    }, 100);
  };

  /**
   * @description Method invoked when Modal closes to return focus back to element triggering Modal.
   *
   * @example
   *
   *    ModalFocusTrap.Deactivate();
   *
   * @return {void}
   */
  this.Deactivate = function () {
    if (triggerTarget) {
      triggerTarget.focus();
      triggerTarget = null;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.ModalFocusTrap === 'undefined') {
      window.ModalFocusTrap = ModalFocusTrap;
    }
  });
})();

// We freeze the object to prevent new properties being added and existing properties being modified or removed
Object.freeze(SelectorEngine);
Object.freeze(ModalFocusTrap);
