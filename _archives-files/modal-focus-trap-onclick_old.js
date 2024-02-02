/**
 * @name modal-focus-trap.js
 * @description Handles trapping focus within an open Modal, and returns focus back to element triggering Modal.
 * @author James Perrin, @jamesperrin | https://github.com/jamesperrin
 * @license Licensed under CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
 * @souce https://gist.github.com/jamesperrin/613d8c1f62ad761b73ff15c3c3c8ba39
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
  getElement(element) {
    if (SelectorEngine.isElement(element)) {
      return element;
    }

    if (typeof element === 'string' && !SelectorEngine.isElement(element)) {
      return document.querySelector(element);
    }

    if (SelectorEngine.isJQueryElement(element)) {
      return element[0];
    }

    return null;
  },
  getElementsAll(element) {
    if (SelectorEngine.isElement(element)) {
      return element;
    }

    if (typeof element === 'string' && !SelectorEngine.isElement(element)) {
      return document.querySelectorAll(element);
    }

    if (SelectorEngine.isJQueryElement(focusTargetElements)) {
      return Array.from(focusTargetElements);
    }

    return null;
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
};

/**
 * @description Handles trapping focus within an open modal, and returns focus back to element triggering modal.
 *
 */
const ModalFocusTrap = new (function () {
  let actualTarget = null;

  /**
   * @description Method invoked when a Modal opens to handle trapping focus within the opened Modal.
   * @param {(String|HTMLElement)} targetModal - Must be a valid CSS selector string, or a DOM reference to Modal element.
   *
   * @example
   *
   *     ModalFocusTrap.CreateFocusTrap(event.target); // -- Using DOM Event Target
   *     ModalFocusTrap.CreateFocusTrap('.modal'); -- Using CSS Selector
   *     ModalFocusTrap.CreateFocusTrap(document.querySelector('.modal')); -- Using DOM Selector
   *     ModalFocusTrap.CreateFocusTrap($('.modal')); -- Using jQuery CSS Selector
   *
   *     Note: Bootstrap "shown.bs.modal" Event, "this" is a reference to the modal element
   *
   *     --- Bootstrap 4
   *     $('.modal').on('shown.bs.modal', function (event) {
   *       ModalFocusTrap.CreateFocusTrap(event.target);  // -- Using DOM Event Target
   *     });
   *
   *     --- Bootstrap 5 and later
   *     document.querySelector('.modal').addEventListener('shown.bs.modal', function (event) {
   *       ModalFocusTrap.CreateFocusTrap(event.target);  // -- Using DOM Event Target
   *     });
   *
   * @return {void}
   */
  this.CreateFocusTrap = function (targetModal) {
    targetModal = SelectorEngine.getElement(targetModal);

    if (!targetModal && !SelectorEngine.isElement(targetModal)) {
      alert(
        'ERROR: \n\nModalFocusTrap CreateFocusTrap\n\nFunction parameter needs to be a CSS selector string, or DOM reference to modal element.',
      );

      console.error('Function parameter needs to be a CSS selector string, or DOM reference to modal element.');

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
   * @description Method invoked to retrieve reference to the element triggering Modal.
   * @param {Event} event Reference to an object containing information about the action that just happened.
   *
   * @returns {HTMLElement}
   */
  this.GetActualTarget = function (event) {
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
    //  document.activeElement || document.body
    return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
  };

  /**
   * @description Handles setting the variable for the element triggering a Modal.
   *
   * @return {void}
   */
  function SetActualTarget(event) {
    actualTarget = ModalFocusTrap.GetActualTarget(event);
  }

  /**
   * @description HTML onclick attribute to handle trapping focus within an open modal, and returning focus back to element triggering modal.
   * @param {(String|HTMLElement)} targetModal - Must be a valid CSS selector string, or a DOM reference to Modal element.
   * @param {(String)} className - Must be a CSS classname indicating a Modal or dialog is open e.g show, active, etc.
   * @param {HTMLElement} focusAfterClosed - Must be a valid CSS selector string, or a DOM reference to Modal element.
   *
   * @example
   *
   *    <button type="button" title="Add" onclick="ModalFocusTrap.ActiveOnClick('#modal-id', this, 'show')">Add</button>
   *
   * @return {void}
   */
  this.ActivateOnClick = function (targetModal, focusAfterClosed, className) {
    if (!className || typeof className !== 'string') {
      alert(
        'ERROR: \n\nModalFocusTrap ActiveOnClick\n\nclassName parameter needs to be a CSS classname indicating a Modal or dialog is open e.g show, active, etc.',
      );

      console.error(
        'className needs to be a CSS classname indicating a Modal or dialog is open e.g show, active, etc.',
      );

      return;
    }

    focusAfterClosed = SelectorEngine.getElement(focusAfterClosed);

    if (!focusAfterClosed && !SelectorEngine.isElement(focusAfterClosed)) {
      alert(
        'ERROR: \n\nModalFocusTrap ActiveOnClick\n\nfocusAfterClosed parameter needs DOM reference to element trigging Modal.',
      );

      console.error('focusAfterClosed parameter needs DOM reference to element trigging Modal.');

      return;
    }

    const validatedModal = SelectorEngine.getElement(targetModal);

    if (!validatedModal) {
      alert(
        'ERROR: \n\nModalFocusTrap ActiveOnClick\n\ntargetModal parameter needs to be a CSS selector string, or DOM reference to modal element.',
      );

      console.error('targetModal parameter needs to be a CSS selector string, or DOM reference to modal element.');

      return;
    }

    actualTarget = focusAfterClosed;

    const checkInterval = setInterval(function () {
      const isModal = className ? document.querySelector(`${targetModal}`).classList.contains(`${className}`) : null;

      if (isModal) {
        clearInterval(checkInterval);
        setTimeout(function () {
          ModalFocusTrap.CreateFocusTrap(targetModal);
        }, 275);
      }
    }, 100);
  };

  /**
   * @description Method invoked before a Modal is created and opened.
   * Creates an addEventListener for all elements that can trigger Modal.
   * The addEventListener handles returning focus back to the triggering element.
   *
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
    focusTargetElements = SelectorEngine.getElementsAll(focusTargetElements);

    if (!focusTargetElements && !SelectorEngine.isElement(focusTargetElements)) {
      alert(
        'ERROR: \n\nModalFocusTrap SetFocusTarget function parameter needs to be a String or DOM reference to element trigging Modal.',
      );

      console.error('Parameter needs to be a String or DOM reference to element trigging Modal.');

      return;
    }

    focusTargetElements.forEach(function (el) {
      el.addEventListener('click', SetActualTarget);
    });
  };

  /**
   * @description Method invoked when Modal closes to handle returning focus back to element triggering Modal.
   *
   * @example
   *
   *    ModalFocusTrap.Deactivate();
   *
   * @return {void}
   */
  this.Deactivate = function () {
    if (actualTarget) {
      actualTarget.focus();
      actualTarget = null;
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
