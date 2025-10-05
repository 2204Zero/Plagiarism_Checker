import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Cloud, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const FileUpload = ({ onFileSelect, selectedFile }: FileUploadProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
      setIsDragActive(false);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: false,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null as unknown as File);
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300",
        isDragActive
          ? "border-primary bg-accent scale-105"
          : "border-border hover:border-primary hover:bg-accent/50"
      )}
    >
      <input {...getInputProps()} />
      
      {selectedFile ? (
        <div className="space-y-4">
          <File className="h-12 w-12 text-primary mx-auto" />
          <div className="flex items-center justify-center gap-2">
            <span className="font-medium">{selectedFile.name}</span>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(2)} KB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Cloud className="h-16 w-16 text-primary mx-auto animate-float" />
          <div>
            <p className="text-lg font-medium">Drop your file or Click to upload</p>
            <p className="text-sm text-muted-foreground mt-2">
              Supports TXT, PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
