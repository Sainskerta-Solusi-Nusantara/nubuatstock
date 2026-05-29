/**
 * EmptyState — re-export PascalCase agar konsisten dengan konvensi penamaan
 * komponen lain (mis. OnboardingTour). Implementasi tunggal ada di
 * `empty-state.tsx` supaya import lama (`@/components/ui/empty-state`) tetap
 * bekerja tanpa duplikasi logika.
 */
export { EmptyState, type EmptyStateAction } from "./empty-state";
