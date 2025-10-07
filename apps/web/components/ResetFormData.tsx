import { useAutoSave } from "../hooks/AutoSaveContext";
import { Button } from "./ui/button";

type ResetFormButtonProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFormData: (data: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialFormData: any;
};

export const ResetFormButton = ({
  setFormData,
  initialFormData,
}: ResetFormButtonProps) => {
  const { resetSavedData } = useAutoSave();

  const handleReset = () => {
    resetSavedData();
    setFormData(initialFormData);
  };

  return (
    <Button className="bg-blue-300 cursor-pointer" onClick={handleReset}>
      Reset Form
    </Button>
  );
};
