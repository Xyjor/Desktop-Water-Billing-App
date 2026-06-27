import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mocking global alert
window.alert = vi.fn();
