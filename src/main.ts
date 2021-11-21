import {
  isEmail,
  isEmpty,
  isMaxLength,
  isMaxNumber,
  isMinLength,
  isMinNumber,
  isNumber,
  isPassword,
  isStrongPassword,
} from './validationUtils';
import {
  EventListenerInterface,
  FieldConfigInterface,
  FieldRuleInterface,
  GlobalConfigInterface,
  GroupFieldInterface,
  GroupFieldsInterface,
  GroupFieldType,
  GroupRuleInterface,
  GroupRules,
  Rules,
  FieldInterface,
  FieldsInterface,
  LocaleInterface,
  CustomStyleTagIds,
  TooltipPositionType,
} from './interfaces';
import { getDefaultFieldMessage, getDefaultGroupMessage } from './messages';
import { isPromise } from './helperUtils';
import { errorLabelCss } from './inlineStyles';
import { TOOLTIP_ARROW_HEIGHT } from './const';

const defaultGlobalConfig: GlobalConfigInterface = {
  errorFieldStyle: {
    color: '#b81111',
    border: '1px solid #B81111',
  },
  errorFieldCssClass: 'js-validate-error-field',
  errorLabelStyle: {
    color: '#b81111',
  },
  errorLabelCssClass: 'js-validate-error-label',
};

class JustValidate {
  form: Element | null = null;
  fields: FieldsInterface = {};
  groupFields: GroupFieldsInterface = {};
  errors: {
    [key: string]: {
      message?: string;
    };
  } = {};
  isValid = false;
  isSubmitted = false;
  globalConfig: GlobalConfigInterface = defaultGlobalConfig;
  errorLabels: HTMLDivElement[] = [];
  eventListeners: EventListenerInterface[] = [];
  dictLocale: LocaleInterface[] = [];
  currentLocale?: string;
  customStyleTags: { [id: string]: HTMLStyleElement } = {};

  constructor(
    form: string | Element,
    globalConfig: Partial<GlobalConfigInterface>,
    dictLocale: LocaleInterface[]
  ) {
    this.initialize(form, globalConfig, dictLocale);
  }

  initialize(
    form: string | Element,
    globalConfig?: Partial<GlobalConfigInterface>,
    dictLocale?: LocaleInterface[]
  ) {
    this.form = null;
    this.errors = {};
    this.isValid = false;
    this.isSubmitted = false;
    this.globalConfig = defaultGlobalConfig;
    this.errorLabels = [];
    this.eventListeners = [];
    this.customStyleTags = {};

    if (typeof form === 'string') {
      const elem = document.querySelector(form);

      if (!elem) {
        throw Error(
          `Form with ${form} selector not found! Please check the form selector`
        );
      }
      this.setForm(elem);
    } else if (form instanceof Element) {
      this.setForm(form);
    } else {
      throw Error(
        `Form selector is not valid. Please specify a string selector or a DOM element.`
      );
    }

    this.globalConfig = { ...defaultGlobalConfig, ...globalConfig };

    if (dictLocale) {
      this.dictLocale = dictLocale;
    }

    if (this.isTooltip()) {
      const styleTag = document.createElement('style');
      styleTag.textContent = errorLabelCss;

      this.customStyleTags[CustomStyleTagIds.Label] = document.head.appendChild(
        styleTag
      );

      document.addEventListener('click', this.handlerDocumentClick);
      this.eventListeners.push({
        type: 'click',
        elem: document,
        func: this.handlerDocumentClick,
      });
    }
  }

  handlerDocumentClick = () => {
    this.clearErrors();
  };

  getLocalisedString(str?: string) {
    if (!this.currentLocale || !this.dictLocale.length) {
      return str;
    }

    const localisedStr = this.dictLocale.find((item) => item.key === str)?.dict[
      this.currentLocale
    ];

    return localisedStr || str;
  }

  getFieldErrorMessage(fieldRule: FieldRuleInterface) {
    return (
      this.getLocalisedString(fieldRule.errorMessage) ||
      getDefaultFieldMessage(fieldRule.rule, fieldRule.value)
    );
  }

  getGroupErrorMessage(groupRule: GroupRuleInterface) {
    return (
      this.getLocalisedString(groupRule.errorMessage) ||
      getDefaultGroupMessage(groupRule.rule)
    );
  }

  setFieldInvalid(field: string, fieldRule: FieldRuleInterface) {
    this.fields[field].isValid = false;
    this.fields[field].errorMessage = this.getFieldErrorMessage(fieldRule);
  }

  setGroupInvalid(groupName: string, groupRule: GroupRuleInterface) {
    this.groupFields[groupName].isValid = false;
    this.groupFields[groupName].errorMessage = this.getGroupErrorMessage(
      groupRule
    );
  }

  setGroupValid(groupName: string) {
    this.groupFields[groupName].isValid = true;
  }

  getElemValue(elem: HTMLInputElement): boolean | string {
    switch (elem.type) {
      case 'checkbox':
        return elem.checked;
      default:
        return elem.value;
    }
  }

  validateGroupRule(
    groupName: string,
    type: GroupFieldType,
    elems: HTMLInputElement[],
    groupRule: GroupRuleInterface
  ): Promise<any> | void {
    switch (groupRule.rule) {
      case GroupRules.Required: {
        if (type === 'radio' || type === 'checkbox') {
          if (elems.every((elem) => !elem.checked)) {
            this.setGroupInvalid(groupName, groupRule);
          } else {
            this.setGroupValid(groupName);
          }
        }
      }
    }
  }

  validateFieldRule(
    field: string,
    elem: HTMLInputElement,
    fieldRule: FieldRuleInterface,
    afterInputChanged = false
  ): Promise<any> | void {
    const ruleValue = fieldRule.value;
    const elemValue = this.getElemValue(elem);

    switch (fieldRule.rule) {
      case Rules.Required: {
        if (isEmpty(elemValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.Email: {
        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        if (!isEmail(elemValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.MaxLength: {
        if (!ruleValue) {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field is not defined. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof ruleValue !== 'number') {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] should be a number. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        console.log(elemValue, ruleValue, isMaxLength(elemValue, ruleValue));

        if (isMaxLength(elemValue, ruleValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.MinLength: {
        if (!ruleValue) {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field is not defined. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof ruleValue !== 'number') {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] should be a number. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        if (isMinLength(elemValue, ruleValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.Password: {
        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        if (!isPassword(elemValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.StrongPassword: {
        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        if (!isStrongPassword(elemValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.Number: {
        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        if (!isNumber(elemValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.MaxNumber: {
        if (!ruleValue) {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field is not defined. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof ruleValue !== 'number') {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field should be a number. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        const num = +elemValue;

        if (Number.isNaN(num) || isMaxNumber(num, ruleValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.MinNumber: {
        if (!ruleValue) {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field is not defined. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof ruleValue !== 'number') {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field should be a number. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        const num = +elemValue;

        if (Number.isNaN(num) || isMinNumber(num, ruleValue)) {
          this.setFieldInvalid(field, fieldRule);
        }
        break;
      }

      case Rules.CustomRegexp: {
        if (!ruleValue) {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field is not defined. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof ruleValue !== 'string') {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] field should be a string. Validation will be skipped for this rule.`
          );
          return;
        }

        let regexp;

        try {
          regexp = new RegExp(ruleValue);
        } catch (e) {
          console.error(
            `Value for ${fieldRule.rule} rule for [${field}] should be a valid regexp. Validation will be skipped for this rule.`
          );
          break;
        }

        if (typeof elemValue !== 'string') {
          this.setFieldInvalid(field, fieldRule);
          break;
        }

        if (!regexp.test(elemValue)) {
          this.setFieldInvalid(field, fieldRule);
        }

        break;
      }

      default: {
        if (!fieldRule.validator) {
          console.error(
            `Validator for custom rule for [${field}] field is not defined. Validation will be skipped for this rule.`
          );
          return;
        }

        if (typeof fieldRule.validator !== 'function') {
          console.error(
            `Validator for custom rule for [${field}] field should be a function. Validation will be skipped for this rule.`
          );
          return;
        }

        const result = fieldRule.validator(elemValue, this.fields);

        if (typeof result !== 'boolean' && typeof result !== 'function') {
          console.error(
            `Validator return value for [${field}] field should be boolean or function. It will be cast to boolean.`
          );
        }

        // we should not call async custom validator on every input change
        if (typeof result === 'function' && !afterInputChanged) {
          const promise = result();

          if (!isPromise(promise)) {
            console.error(
              `Validator function for custom rule for [${field}] field should return a Promise. Validation will be skipped for this rule.`
            );
            return;
          }

          return promise
            .then((resp) => {
              if (!resp) {
                this.setFieldInvalid(field, fieldRule);
              }
            })
            .catch(() => {
              this.setFieldInvalid(field, fieldRule);
            });
        }

        if (!result) {
          this.setFieldInvalid(field, fieldRule);
        }
      }
    }
  }

  validateField(
    fieldName: string,
    field: FieldInterface,
    afterInputChanged = false
  ): Promise<any> | void {
    field.isValid = true;
    const promises: Promise<any>[] = [];
    [...field.rules].reverse().forEach((rule) => {
      const res = this.validateFieldRule(
        fieldName,
        field.elem,
        rule,
        afterInputChanged
      );

      if (isPromise(res)) {
        promises.push(res as Promise<any>);
      }
    });

    return Promise.allSettled(promises);
  }

  validateGroup(
    groupName: string,
    group: GroupFieldInterface
  ): Promise<any> | void {
    const promises: Promise<any>[] = [];
    [...group.rules].reverse().forEach((rule) => {
      const res = this.validateGroupRule(
        groupName,
        group.type,
        group.elems,
        rule
      );

      if (isPromise(res)) {
        promises.push(res as Promise<any>);
      }
    });

    return Promise.allSettled(promises);
  }

  focusInvalidField() {
    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];
      if (this.globalConfig.focusInvalidField && !field.isValid) {
        field.elem.focus();
        break;
      }
    }
  }

  validate(): Promise<any> | void {
    const promises: Promise<any>[] = [];

    Object.keys(this.fields).forEach((fieldName) => {
      const field = this.fields[fieldName];
      const promise = this.validateField(fieldName, field);

      if (isPromise(promise)) {
        promises.push(promise as Promise<any>);
      }
    });

    Object.keys(this.groupFields).forEach((groupName) => {
      const group = this.groupFields[groupName];
      const promise = this.validateGroup(groupName, group);

      if (isPromise(promise)) {
        promises.push(promise as Promise<any>);
      }
    });

    if (promises.length) {
      Promise.allSettled(promises).then(() => {
        this.renderErrors();
        this.focusInvalidField();
      });
    } else {
      this.renderErrors();
      this.focusInvalidField();
    }
  }

  setForm(form: Element) {
    this.form = form;
    this.form.setAttribute('novalidate', 'novalidate');
    this.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      this.isSubmitted = true;
      this.validate();
    });
  }

  handleFieldChange = (target: HTMLInputElement) => {
    let currentField;
    let currentFieldName;

    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];

      if (field.elem === target) {
        currentField = field;
        currentFieldName = fieldName;
        break;
      }
    }

    if (!currentField || !currentFieldName) {
      return;
    }

    this.validateField(currentFieldName, currentField, true);
  };

  handleGroupChange = (target: HTMLInputElement) => {
    let currentGroup;
    let currentGroupName;

    for (const groupName in this.groupFields) {
      const group = this.groupFields[groupName];

      if (group.elems.find((elem) => elem === target)) {
        currentGroup = group;
        currentGroupName = groupName;
        break;
      }
    }

    if (!currentGroup || !currentGroupName) {
      return;
    }

    this.validateGroup(currentGroupName, currentGroup);
  };

  handlerChange = (ev: Event) => {
    if (!ev.target) {
      return;
    }

    this.handleFieldChange(ev.target as HTMLInputElement);
    this.handleGroupChange(ev.target as HTMLInputElement);

    if (!this.isTooltip()) {
      this.renderErrors();
    }
  };

  addListener(type: string, elem: HTMLInputElement) {
    elem.addEventListener(type, this.handlerChange);
    this.eventListeners.push({ type, elem, func: this.handlerChange });
  }

  addField(
    field: string,
    rules: FieldRuleInterface[],
    config?: FieldConfigInterface
  ): JustValidate {
    if (typeof field !== 'string') {
      throw Error(
        `Field selector is not valid. Please specify a string selector.`
      );
    }

    const elem = document.querySelector(field) as HTMLInputElement;

    if (!elem) {
      throw Error(
        `Field with ${field} selector not found! Please check the field selector.`
      );
    }

    if (!Array.isArray(rules) || !rules.length) {
      throw Error(
        `Rules argument for the field [${field}] should be an array and should contain at least 1 element.`
      );
    }

    rules.forEach((item) => {
      if (!('rule' in item || 'validator' in item)) {
        throw Error(
          `Rules argument for the field [${field}] must contain at least one rule or validator property.`
        );
      }
    });

    this.fields[field] = {
      elem,
      rules,
      value: '',
      isDirty: false,
      isValid: undefined,
      config,
    };

    this.setListeners(elem);
    return this;
  }

  addRequiredGroup(
    groupField: string,
    errorMessage?: string,
    config?: FieldConfigInterface
  ): JustValidate {
    if (typeof groupField !== 'string') {
      throw Error(
        `Group selector is not valid. Please specify a string selector.`
      );
    }

    const elem = document.querySelector(groupField) as HTMLElement;

    if (!elem) {
      throw Error(
        `Group with ${groupField} selector not found! Please check the group selector.`
      );
    }

    const inputs: NodeListOf<HTMLInputElement> = elem.querySelectorAll('input');

    const isRadio = Array.from(inputs).every((input) => input.type === 'radio');

    const isCheckbox = Array.from(inputs).every(
      (input) => input.type === 'checkbox'
    );

    if (!isRadio && !isCheckbox) {
      throw Error(`Group should contain either or checkboxes or radio buttons`);
    }

    this.groupFields[groupField] = {
      rules: [
        {
          rule: GroupRules.Required,
          errorMessage,
        },
      ],
      groupElem: elem,
      elems: Array.from(inputs),
      type: isRadio ? 'radio' : 'checkbox',
      isDirty: false,
      isValid: undefined,
      config,
    };

    inputs.forEach((input) => {
      this.setListeners(input);
    });

    return this;
  }

  setListeners(elem: HTMLInputElement) {
    switch (elem.type) {
      case 'checkbox':
      case 'select-one':
      case 'radio': {
        this.addListener('change', elem);
        break;
      }

      default: {
        this.addListener('keyup', elem);
      }
    }
  }

  removeField(field: string): JustValidate {
    if (typeof field !== 'string') {
      throw Error(
        `Field selector is not valid. Please specify a string selector.`
      );
    }

    if (!(field in this.fields)) {
      console.warn(`There is no [${field}] field.`);
      return this;
    }

    delete this.fields[field];
    return this;
  }

  clearErrors() {
    this.errorLabels.forEach((item) => item.remove());

    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];

      const style =
        field.config?.errorFieldStyle || this.globalConfig.errorFieldStyle;

      Object.keys(style).forEach((key) => {
        field.elem.style[key] = '';
      });
    }

    for (const groupName in this.groupFields) {
      const group = this.groupFields[groupName];

      const style =
        group.config?.errorFieldStyle || this.globalConfig.errorFieldStyle;

      Object.keys(style).forEach((key) => {
        group.elems.forEach((elem) => {
          elem.style[key] = '';
        });
      });
    }
  }

  isTooltip() {
    return !!this.globalConfig.tooltip;
  }

  lockForm() {
    const elems: NodeListOf<HTMLInputElement> = this.form!.querySelectorAll(
      'input, textarea, button, select'
    );
    for (let i = 0, len = elems.length; i < len; ++i) {
      elems[i].setAttribute('disabled', 'disabled');
      elems[i].style.pointerEvents = 'none';
      elems[i].style.webkitFilter = 'grayscale(100%)';
      elems[i].style.filter = 'grayscale(100%)';
    }
  }

  unlockForm() {
    const elems: NodeListOf<HTMLInputElement> = this.form!.querySelectorAll(
      'input, textarea, button, select'
    );
    for (let i = 0, len = elems.length; i < len; ++i) {
      elems[i].removeAttribute('disabled');
      elems[i].style.pointerEvents = '';
      elems[i].style.webkitFilter = '';
      elems[i].style.filter = '';
    }
  }

  renderTooltip(
    elem: HTMLElement,
    errorLabel: HTMLDivElement,
    position?: TooltipPositionType
  ) {
    const { top, left, width, height } = elem.getBoundingClientRect();
    const errorLabelRect = errorLabel.getBoundingClientRect();

    const pos = position || this.globalConfig.tooltip?.position;

    switch (pos) {
      case 'left': {
        errorLabel.style.top = `${top +
          height / 2 -
          errorLabelRect.height / 2}px`;
        errorLabel.style.left = `${left -
          errorLabelRect.width -
          TOOLTIP_ARROW_HEIGHT}px`;
        break;
      }

      case 'top': {
        errorLabel.style.top = `${top -
          errorLabelRect.height -
          TOOLTIP_ARROW_HEIGHT}px`;
        errorLabel.style.left = `${left +
          width / 2 -
          errorLabelRect.width / 2}px`;
        break;
      }

      case 'right': {
        errorLabel.style.top = `${top +
          height / 2 -
          errorLabelRect.height / 2}px`;
        errorLabel.style.left = `${left + width + TOOLTIP_ARROW_HEIGHT}px`;
        break;
      }

      case 'bottom': {
        errorLabel.style.top = `${top + height + TOOLTIP_ARROW_HEIGHT}px`;
        errorLabel.style.left = `${left +
          width / 2 -
          errorLabelRect.width / 2}px`;
        break;
      }
    }

    errorLabel.dataset.direction = pos;
  }

  createErrorLabelElem(errorMessage: string, config?: FieldConfigInterface) {
    const errorLabel = document.createElement('div');
    errorLabel.innerHTML = errorMessage;

    const customErrorLabelStyle = this.isTooltip()
      ? config?.errorLabelStyle
      : config?.errorLabelStyle || this.globalConfig.errorLabelStyle;

    Object.assign(errorLabel.style, customErrorLabelStyle);

    errorLabel.classList.add(
      config?.errorLabelCssClass || this.globalConfig.errorLabelCssClass,
      'just-validate-error-label'
    );

    this.errorLabels.push(errorLabel);

    return errorLabel;
  }

  renderErrors() {
    if (!this.isSubmitted) {
      return;
    }
    this.clearErrors();
    this.unlockForm();

    this.isValid = false;

    for (const groupName in this.groupFields) {
      const group = this.groupFields[groupName];

      if (group.isValid) {
        continue;
      }

      group.elems.forEach((elem) => {
        Object.assign(
          elem.style,
          group.config?.errorFieldStyle || this.globalConfig.errorFieldStyle
        );
        elem.classList.add(
          group.config?.errorFieldCssClass ||
            this.globalConfig.errorFieldCssClass
        );
      });

      const errorLabel = this.createErrorLabelElem(
        group.errorMessage!,
        group.config
      );

      group.groupElem.appendChild(errorLabel);

      if (this.isTooltip()) {
        this.renderTooltip(
          group.groupElem,
          errorLabel,
          group.config?.tooltip?.position
        );
      }
    }

    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];

      if (field.isValid) {
        continue;
      }

      field.elem.classList.add(
        field.config?.errorFieldCssClass || this.globalConfig.errorFieldCssClass
      );

      const errorLabel = this.createErrorLabelElem(
        field.errorMessage!,
        field.config
      );

      if (field.elem.type === 'checkbox' || field.elem.type === 'radio') {
        const label = document.querySelector(
          `label[for="${field.elem.getAttribute('id')}"]`
        );

        if (field.elem.parentElement?.tagName?.toLowerCase() === 'label') {
          field.elem.parentElement?.parentElement?.appendChild(errorLabel);
        } else if (label) {
          label.parentElement?.appendChild(errorLabel);
        } else {
          field.elem.parentElement?.appendChild(errorLabel);
        }
      } else {
        field.elem.parentElement?.appendChild(errorLabel);
      }

      if (this.isTooltip()) {
        this.renderTooltip(
          field.elem,
          errorLabel,
          field.config?.tooltip?.position
        );
      }
    }
  }

  destroy() {
    this.eventListeners.forEach((event) => {
      event.elem.removeEventListener(event.type, event.func);
    });

    Object.keys(this.customStyleTags).forEach((key) => {
      this.customStyleTags[key].remove();
    });
  }

  refresh() {
    this.clearErrors();
    this.unlockForm();
    this.destroy();

    if (!this.form) {
      console.error('Cannot initialize the library! Form is not defined');
    } else {
      this.initialize(this.form, this.globalConfig);

      Object.keys(this.fields).forEach((key) => {
        this.addField(
          key,
          [...this.fields[key].rules],
          this.fields[key].config
        );
      });
    }
  }

  setCurrentLocale(locale: string) {
    if (typeof locale !== 'string') {
      console.error('Current locale should be a string');
      return;
    }

    this.currentLocale = locale;
  }
}

export default JustValidate;