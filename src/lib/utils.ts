import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BridgeForm, ValidationResult } from "./types";
import { ethers } from "ethers";



export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const validateBridgeForm = (form: BridgeForm): ValidationResult => {
  const errors: Record<string, string> = {};

  if (
    !form.token ||
    !form.amount ||
    !form.recipient ||
    form.fromChain === 0 ||
    form.toChain === 0 ||
    form.fromChain === form.toChain
  ) {
    if (!form.token) {
      errors.token = 'Token address is required';
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    if (!form.recipient) {
      errors.recipient = 'Recipient address is required';
    }
    if (form.fromChain === 0) {
      errors.fromChain = 'Source chain is required';
    }
    if (form.toChain === 0) {
      errors.toChain = 'Destination chain is required';
    }
    if (form.fromChain === form.toChain && form.fromChain !== 0) {
      errors.chain = 'Source and destination chains must be different';
    }
  } else if (!ethers.isAddress(form.recipient)) {
    errors.recipient = 'Please enter a valid Ethereum address';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};