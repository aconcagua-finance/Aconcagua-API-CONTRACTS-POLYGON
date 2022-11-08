const Joi = require('joi');

const { Types } = require('../../vs-core');

const basicData = {
  loanStatus: Joi.string(),
  currency: Joi.string(),
  amount: Joi.number(),
  dueDate: Joi.date().allow(null, ''),
  amortizationType: Joi.string(),
  taxType: Joi.string(),
  numberOfInstallments: Joi.number(),
  tna: Joi.number(),
  tea: Joi.number(),
  cftWithoutTaxes: Joi.number(),
  cftWithTaxes: Joi.number(),

  capitalAmount: Joi.number(),
  interestsAmount: Joi.number(),
  taxesAmount: Joi.number(),
  otherExpenses: Joi.number(),

  rescueWalletAccount: Joi.string().allow(''),

  notes: Joi.string().allow(''),
  attachments: Joi.any(),
};

const createSchema = Joi.object({
  ...basicData,

  creditType: Joi.string().required(),

  dueDate: Joi.alternatives().conditional('creditType', {
    is: [
      Types.CreditTypes.CREDIT_TYPE_INSTALLMENT,
      Types.CreditTypes.CREDIT_TYPE_BULLET_ADVANCED,
      Types.CreditTypes.CREDIT_TYPE_BULLET_EXPIRATION,
    ],
    then: Joi.date().required(),
    otherwise: Joi.date().allow(null, ''),
  }),

  numberOfInstallments: Joi.alternatives().conditional('creditType', {
    is: [Types.CreditTypes.CREDIT_TYPE_INSTALLMENT],
    then: Joi.number().required(),
    otherwise: Joi.number(),
  }),

  //   // autoassigned on creation, not accepted onupdate
  userId: Joi.string(),
  companyId: Joi.string(),
  contractAddress: Joi.string(),
  contractVersion: Joi.string().allow(''),
  contractSignerAddress: Joi.string(),
  contractNetwork: Joi.string(),
  contractDeployment: Joi.any(),
  contractName: Joi.string(),
  contractStatus: Joi.string(),
  contractError: Joi.string().allow(null).allow(''),
});

const updateSchema = Joi.object({
  ...basicData,
});

const requiredBaseFields = [
  'userId',
  'companyId',
  'contractAddress',
  'contractSignerAddress',
  'contractName',
  'creditType',
  'loanStatus',
  'currency',
  'amount',
];

const schemas = {
  create: createSchema.fork(requiredBaseFields, (field) => field.required()),
  update: updateSchema,
};

module.exports = schemas;
