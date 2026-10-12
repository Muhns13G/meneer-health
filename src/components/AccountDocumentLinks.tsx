import { useEffect, useRef, useState } from "react";
import type { ActivationView } from "@/domain/identity/pilot-activation";

export function AccountDocumentLinks({ documents }: Pick<ActivationView, "documents">) {
  const [selected, setSelected] = useState<ActivationView["documents"][number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = (id: string) =>
    id === "pilot-account-terms" ? "Account and service terms" : "Transactional privacy notice";
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-4" aria-label="Account documents">
        {documents.map((document) => (
          <button
            key={document.publicationId}
            type="button"
            className="min-h-11 text-gold underline underline-offset-4"
            onClick={() => setSelected(document)}
          >
            Read {title(document.instrumentId)}
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="account-document-title"
        onClose={() => setSelected(null)}
        className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 text-foreground backdrop:bg-black/70"
      >
        {selected && (
          <>
            <div className="flex items-start justify-between gap-4">
              <h2 id="account-document-title" className="font-serif text-2xl">
                {title(selected.instrumentId)}
              </h2>
              <button
                type="button"
                autoFocus
                className="action-secondary shrink-0"
                onClick={() => dialog.current?.close()}
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-sm">
              Version {selected.version} · {selected.locale} · Effective{" "}
              {selected.effectiveAt.slice(0, 10)}
            </p>
            <p className="mt-5 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
            <a
              className="action-secondary mt-5"
              download={`${selected.instrumentId}-${selected.version}.txt`}
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(selected.body)}`}
            >
              Save this exact version
            </a>
          </>
        )}
      </dialog>
    </>
  );
}
