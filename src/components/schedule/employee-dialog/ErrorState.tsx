export function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-500 p-2">
      Error: {message}
    </p>
  );
}