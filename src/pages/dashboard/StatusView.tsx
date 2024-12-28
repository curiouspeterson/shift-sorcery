import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StatusView() {
  const [statusContent, setStatusContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/STATUS.md")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load status file");
        }
        return response.text();
      })
      .then((content) => {
        setStatusContent(content);
      })
      .catch((err) => {
        console.error("Error loading status:", err);
        setError("Failed to load application status");
      });
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Application Status</h1>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {statusContent.split("\n").map((line, index) => {
          if (line.startsWith("# ")) {
            return <h1 key={index} className="text-2xl font-bold mt-6 mb-4">{line.substring(2)}</h1>;
          } else if (line.startsWith("## ")) {
            return <h2 key={index} className="text-xl font-semibold mt-4 mb-3">{line.substring(3)}</h2>;
          } else if (line.startsWith("### ")) {
            return <h3 key={index} className="text-lg font-medium mt-3 mb-2">{line.substring(4)}</h3>;
          } else if (line.startsWith("- ")) {
            return <li key={index} className="ml-4">{line.substring(2)}</li>;
          } else if (line.trim() === "") {
            return <br key={index} />;
          } else {
            return <p key={index}>{line}</p>;
          }
        })}
      </div>
    </div>
  );
}