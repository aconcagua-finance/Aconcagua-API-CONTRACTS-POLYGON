import { z } from 'zod';

export const SafeTransactionDataSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string(),
  sender: z.string(),
  safeTxGas: z.number().optional(),
  baseGas: z.number().optional(),
  gasPrice: z.number().optional(),
  gasToken: z.string().optional(),
  refundReceiver: z.string().optional(),
  nonce: z.number().optional(),
});

export type SafeTransactionInput = z.infer<typeof SafeTransactionDataSchema>;

export const SafeTransactionOutputSchema = z.object({
  signer: z.string(),
  data: z.string(),
  hash: z.string(),
  to: z.string(),
  value: z.string(),
  operation: z.number(),
  txData: z.string(),
});

export type SafeTransactionOutput = z.infer<typeof SafeTransactionOutputSchema>;

export const GetTransactionSchema = z.object({
  hash: z.string(),
});

export type GetTransactionInput = z.infer<typeof GetTransactionSchema>;

export const GetTransactionOutputSchema = z.object({
  safe: z.string(),
  to: z.string(),
  value: z.string(),
  data: z.any(),
  operation: z.number(),
  gasToken: z.string(),
  safeTxGas: z.number(),
  baseGas: z.number(),
  gasPrice: z.string(),
  nonce: z.number(),
  submissionDate: z.string(),
  modified: z.string(),
  transactionHash: z.any(),
  safeTxHash: z.string(),
  isExecuted: z.boolean(),
  origin: z.string(),
  confirmationsRequired: z.number(),
});

export type GetTransactionOutput = z.infer<typeof GetTransactionOutputSchema>;

export const GetPendingTransactionOutputSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      safe: z.string(),
      to: z.string(),
      value: z.string(),
      data: z.any(),
      safeTxHash: z.string(),
    })
  ),
});

export type GetPendingTransactionsOutput = z.infer<typeof GetPendingTransactionOutputSchema>;

export const ConfirmTransactionSchema = z.object({
  hash: z.string(),
  data: z.string(),
  signer: z.string(),
  to: z.string(),
  value: z.string(),
  operation: z.number(),
  txData: z.string(),
});

export type ConfirmTransactionInput = z.infer<typeof ConfirmTransactionSchema>;

export const ConfirmTransactionOutputSchema = z.object({
  hash: z.string(),
  nonce: z.union([z.number(), z.undefined()]),
  to: z.union([z.string(), z.undefined()]),
  from: z.union([z.string(), z.undefined()]),
  blockNumber: z.union([z.number(), z.undefined()]),
  confirmations: z.union([z.number(), z.undefined()]),
});

export type ConfirmTransactionOutput = z.infer<typeof ConfirmTransactionOutputSchema>;

export const RejectTransactionSchema = z.object({
  nonce: z.number(),
});

export type RejectTransactionInput = z.infer<typeof RejectTransactionSchema>;

export const GetOwnersOutputSchema = z.object({
  count: z.number(),
  owners: z.string().array(),
});

export type GetOwnersOutput = z.infer<typeof GetOwnersOutputSchema>;
