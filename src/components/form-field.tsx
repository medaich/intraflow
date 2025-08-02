import { InfoIcon } from "lucide-react";
import { Input } from "./ui/input";
import type { InputErrors } from "@/pages/login";

interface FormFieldTypes {
  name: string;
  type: string;
  placeholder?: string;
  val: string;
  setVal: React.Dispatch<React.SetStateAction<string>>;
  isLoad: boolean;
  validate?: {
    key: keyof InputErrors;
    validateRegex: RegExp;
    inputErrs: InputErrors;
    setInputErrs: React.Dispatch<React.SetStateAction<InputErrors>>;
    message: string;
  };
}

const FormField = ({
  name,
  type,
  placeholder,
  val,
  setVal,
  isLoad,
  validate,
}: FormFieldTypes) => {
  const isValid = !validate || !validate.inputErrs[validate.key]; // either no validation or no associated errors

  const onValidate = () => {
    if (!validate) return;
    validate.setInputErrs((errs) => ({
      ...errs,
      [validate.key]: !validate.validateRegex.test(val),
    }));
  };
  return (
    <label htmlFor="email" className="space-y-4">
      <p className="font-semibold capitalize">{name}</p>

      <div className="space-y-2">
        <Input
          type={type}
          aria-invalid={validate && validate.inputErrs[validate.key]}
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={onValidate}
          id={name}
          name={name}
          required
          disabled={isLoad}
        />
        {!isValid && (
          <p className="bg-destructive/10 p-2 text-destructive rounded text-sm flex gap-2 items-center">
            <InfoIcon />
            {validate.message}
          </p>
        )}
      </div>
    </label>
  );
};

export default FormField;
