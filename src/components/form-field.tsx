import { InfoIcon } from "lucide-react";
import { Input } from "./ui/input";

interface FormFieldProps {
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  isLoading?: boolean;
  error?: string;
  required?: boolean;
}

const FormField = ({
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  isLoading = false,
  error,
  required = false,
}: FormFieldProps) => {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-sm font-medium capitalize text-foreground block"
      >
        {name} {required && <span className="text-destructive">*</span>}
      </label>

      <Input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={isLoading}
      />
      {error && (
        <p className="bg-destructive/10 p-2 text-destructive rounded text-xs flex gap-2 items-center">
          <InfoIcon className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
