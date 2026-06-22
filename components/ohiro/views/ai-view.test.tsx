// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileThumbnail, ToolCard, MarkdownText } from "./ai-view";

describe("FileThumbnail", () => {
  const baseFile = {
    id: "1",
    name: "extrato.pdf",
    type: "application/pdf",
    size: 234_000,
    base64: "",
  };

  it("mostra nome, extensão e tamanho do arquivo", () => {
    render(<FileThumbnail file={baseFile} />);
    expect(screen.getByText("extrato.pdf")).toBeInTheDocument();
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
    expect(screen.getByText(/229 KB/)).toBeInTheDocument();
  });

  it("usa preview de imagem quando disponível", () => {
    render(<FileThumbnail file={{ ...baseFile, name: "foto.png", type: "image/png", preview: "blob:fake" }} />);
    const img = screen.getByAltText("foto.png");
    expect(img).toHaveAttribute("src", "blob:fake");
  });

  it("dispara onRemove ao clicar no botão de remover", () => {
    const onRemove = vi.fn();
    render(<FileThumbnail file={baseFile} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("Remove extrato.pdf"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("não renderiza botão de remover quando onRemove não é passado", () => {
    render(<FileThumbnail file={baseFile} />);
    expect(screen.queryByLabelText("Remove extrato.pdf")).not.toBeInTheDocument();
  });
});

describe("ToolCard", () => {
  it("mostra estado de execução em andamento com o label da tool", () => {
    render(<ToolCard part={{ type: "tool-invocation", toolName: "addTransaction" }} />);
    expect(screen.getByText(/Logging entry…/)).toBeInTheDocument();
  });

  it("mostra mensagem de sucesso quando a tool termina com output-available", () => {
    render(
      <ToolCard
        part={{
          type: "tool-invocation",
          toolName: "addTransaction",
          state: "output-available",
          result: { success: true, message: "Lançamento adicionado." },
        }}
      />
    );
    expect(screen.getByText("Lançamento adicionado.")).toBeInTheDocument();
  });

  it("mostra erro quando state é output-error", () => {
    render(
      <ToolCard
        part={{
          type: "tool-invocation",
          toolName: "deleteTransaction",
          state: "output-error",
          result: { success: false, error: "Lançamento não encontrado." },
        }}
      />
    );
    expect(screen.getByText("Lançamento não encontrado.")).toBeInTheDocument();
  });

  it("cai no label genérico para tools desconhecidas", () => {
    render(<ToolCard part={{ type: "tool-invocation", toolName: "toolInexistente" }} />);
    expect(screen.getByText(/toolInexistente…/)).toBeInTheDocument();
  });
});

describe("MarkdownText", () => {
  it("renderiza títulos, listas e negrito", () => {
    render(<MarkdownText text={"## Resumo\n- gasto: **R$ 100,00**\n- saldo: 50"} />);
    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
    expect(screen.getByText(/saldo: 50/)).toBeInTheDocument();
  });

  it("renderiza listas numeradas", () => {
    render(<MarkdownText text={"1. primeiro passo\n2. segundo passo"} />);
    expect(screen.getByText(/primeiro passo/)).toBeInTheDocument();
    expect(screen.getByText(/segundo passo/)).toBeInTheDocument();
  });

  it("renderiza código inline", () => {
    render(<MarkdownText text={"use `addTransaction` para registrar"} />);
    expect(screen.getByText("addTransaction")).toBeInTheDocument();
  });
});
