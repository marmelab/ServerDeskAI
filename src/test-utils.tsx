import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

type WrapperOptions = {
  initialEntries?: string[];
};

export const createWrapper = (options: WrapperOptions = {}) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options.initialEntries ?? ["/"]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
  return Wrapper;
};

export const renderWithProviders = (
  ui: ReactNode,
  options: WrapperOptions & Omit<RenderOptions, "wrapper"> = {},
) => {
  const { initialEntries, ...renderOptions } = options;
  return render(ui, {
    wrapper: createWrapper({ initialEntries }),
    ...renderOptions,
  });
};

export { createTestQueryClient };
