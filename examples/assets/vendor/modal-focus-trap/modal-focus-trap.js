/**
 * @name modal-focus-trap.js
 * @version 1.1.0.0
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
  getObject(options) {
    if (options && typeof options === 'object') {
      return options;
    }

    if (options && typeof options === 'string') {
      return JSON.parse(options);
    }

    return null;
  },
};

/**
 * @description Handles trapping focus within an opened Modal, and returning focus back to the element triggering Modal.
 *
 */
const ModalFocusTrap = new (function () {
  // ===========================
  // PRIVATE DECLARATIONS
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  let _triggerTarget = null;

  const _settingNames = {
    className: 'className',
    initialFocusNode: 'initialFocusNode',
    timeout: 'timeout',
  };

  const _settings = {
    className: null,
    initialFocusNode: null,
    timeout: 500,
  };

  function _getActualTargetTrigger(targetTrigger) {
    return targetTrigger || document.activeElement || document.body;
  }

  /**
   * @description Method invoked to retrieve reference to the element triggering Modal.
   * @param {Event} event Reference to an object containing information about the action that just happened.
   *
   * @returns {HTMLElement}
   */
  function _getTriggerTarget(event) {
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
    if (event.target.shadowRoot && typeof event.composedPath === 'function') {
      return event.composedPath()[0];
    } else {
      return _getActualTargetTrigger(event.target);
    }
  }

  // ===========================
  // PUBLIC DECLARATIONS
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
   *     ModalFocusTrap.GetTriggerTargets(document.querySelector('button.modal--trigger')); -- Using DOM Selector
   *     ModalFocusTrap.GetTriggerTargets(document.querySelectorAll('button.modal--trigger')); -- Using DOM Selector
   *     ModalFocusTrap.GetTriggerTargets($('button.modal--trigger')); -- Using jQuery CSS Selector
   *
   * @return {void}
   */
  this.GetTriggerTargets = function (triggerTargets) {
    triggerTargets = SelectorEngine.queryElementAll(triggerTargets);

    if (!triggerTargets || triggerTargets.length === 0) {
      alert(
        'ERROR: ModalFocusTrap GetTriggerTargets  \n\nFunction parameter needs to be a String or DOM reference to elements trigging a Modal.',
      );
      console.error('Parameter needs to be a String or DOM reference to element trigging a Modal.');
      return;
    }

    // Handles setting the variable for the element triggering a Modal.
    if (SelectorEngine.isNodeList(triggerTargets) && triggerTargets.length) {
      triggerTargets.forEach(function (el) {
        el.addEventListener('click', function (event) {
          _triggerTarget = _getTriggerTarget(event);
        });
      });
    }
  };

  /**
   * @description Method invoked when a Modal opens to handle trapping focus within the opened Modal. The method ModalFocusTrap.GetTriggerTargets() must be invoked before invoking this method.
   * @param {(String|HTMLElement)} targetModal Must be a valid CSS selector String, or a DOM reference to Modal element.
   * @param {(String|HTMLElement)} initialElementFocus (Optional) Must be a valid CSS selector String, or a DOM reference to initial focus element.
   *
   * @example
   *
   *     ModalFocusTrap.Activate(event.target); // -- Using DOM Event Target
   *     ModalFocusTrap.Activate('.modal'); -- Using CSS Selector
   *     ModalFocusTrap.Activate(document.querySelector('.modal')); -- Using DOM Selector
   *     ModalFocusTrap.Activate($('.modal')); -- Using jQuery CSS Selector
   *
   *     Note: Bootstrap "shown.bs.modal" Event, "this" is a reference to Modal element
   *
   *     --- Bootstrap 4
   *     $('.modal').on('shown.bs.modal', function (event) {
   *       ModalFocusTrap.Activate(event.target);  // -- Using DOM Event Target
   *     });
   *
   *     --- Bootstrap 5 and later
   *     document.querySelector('.modal').addEventListener('shown.bs.modal', function (event) {
   *       ModalFocusTrap.Activate(event.target);  // -- Using DOM Event Target
   *     });
   *
   * @return {void}
   */
  this.Activate = function (targetModal, initialElementFocus) {
    const trapModalTarget = SelectorEngine.queryElement(targetModal);

    if (!trapModalTarget) {
      alert(
        'ERROR: ModalFocusTrap Activate.\n\nFunction parameter needs to be a CSS selector String, or DOM reference to a Modal element.',
      );

      console.error('Function parameter needs to be a CSS selector String, or DOM reference to a Modal element.');

      return;
    }

    const TAB_KEY = 'Tab';
    const elements = SelectorEngine.focusableChildren(trapModalTarget);

    if (elements.length === 0) {
      trapModalTarget.focus();
      return;
    }

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    initialElementFocus = SelectorEngine.queryElement(initialElementFocus);

    if (initialElementFocus) {
      const idx = elements.indexOf(initialElementFocus);

      if (idx !== -1) {
        elements[idx].focus();
      }
    } else {
      firstElement.focus();
    }

    firstElement.addEventListener('keydown', function (event) {
      if (event.key == TAB_KEY && event.shiftKey) {
        event.stopPropagation();
        event.preventDefault();
        lastElement.focus();
      }
    });

    lastElement.addEventListener('keydown', function (event) {
      if (event.key == TAB_KEY && !event.shiftKey) {
        event.stopPropagation();
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
   *    HTML
   *    <button type="button" title="Add 1" class="modal__trigger" onclick="ModalFocusTrap.ActivateOnClick('#modal-id', this)">
   *      Add 1
   *    </button>
   *
   *    <button type="button" title="Add 2" class="modal__trigger" onclick="ModalFocusTrap.ActivateOnClick('.modal', this, JSON.parse('{&quot;className&quot;: &quot;show&quot;}'))">
   *      Add 2
   *    </button>
   *
   *    <script>
   *      document.querySelectorAll('.modal__trigger).forEach(function (el) {
   *        el.addEventListener('click', function () {
   *          CreateModalOnClick();
   *        });
   *      });
   *    </script>
   *
   * @return {void}
   */
  this.ActivateOnClick = function (targetModal, triggerElement, options) {
    let className = null;
    let initialFocusNode = null;
    let timeout = 400;

    if (options) {
      options = SelectorEngine.getObject(options);
      className = Object.hasOwn(options, _settingNames.className)
        ? options[_settingNames.className]
        : _settings.className;
      initialFocusNode = Object.hasOwn(options, _settingNames.initialFocusNode)
        ? options[_settingNames.initialFocusNode]
        : _settings.initialFocusNode;
      timeout = Object.hasOwn(options, _settingNames.timeout) ? options[_settingNames.timeout] : _settings.timeout;
    }

    // Handles setting the variable for the element triggering a Modal.
    triggerElement = SelectorEngine.queryElement(triggerElement);
    _triggerTarget = _getActualTargetTrigger(triggerElement);

    const checkInterval = setInterval(function () {
      const trapModalTarget = SelectorEngine.queryElement(targetModal);
      initialFocusNode = SelectorEngine.queryElement(initialFocusNode);

      if (!trapModalTarget) {
        clearInterval(checkInterval);

        alert(
          'ERROR: ModalFocusTrap ActiveOnClick\n\nParameter targetModal needs to be a CSS selector String, or DOM reference to a Modal element.',
        );

        console.error('Parameter targetModal needs to be a CSS selector String, or DOM reference to a Modal element.');

        return;
      }

      const hasModal = !className ? trapModalTarget : trapModalTarget.classList.contains(`${className}`);

      if (hasModal) {
        clearInterval(checkInterval);
        setTimeout(function () {
          ModalFocusTrap.Activate(trapModalTarget, initialFocusNode);
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
    _triggerTarget = _getActualTargetTrigger(_triggerTarget);
    _triggerTarget.focus();
    _triggerTarget = null;
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
