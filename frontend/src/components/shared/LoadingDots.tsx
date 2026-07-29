export default function LoadingDots() {
  return (
    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-lyratech-light-purple/50">
      <span className="w-2 h-2 rounded-full bg-lyratech-purple animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-lyratech-purple animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-lyratech-purple animate-bounce" />
    </div>
  );
}
