// Which layout the contact page's left column uses while Lucas compares them
// (2026-11-23). Change this one number to switch.
//   1. The titles are the form's first question: pick one, it's marked with a
//      red bar, its paragraph shows, and the message box asks about it.
//      (ContactDesk.tsx)
//   2. The form as one sentence in large Times, single column, the inquiry
//      type a dropdown inside it. (ContactSentence.tsx)
//   3. A quiet directory: titles and paragraphs always shown, a "Write about
//      this" link under each that sets the form's topic. (ContactDirectory.tsx)
//   4. The left column as a solid navy block with white Times titles that
//      open to their paragraph; form on white. (InquiryCards.tsx, as 0)
//   0. What was there before the trial: underlined titles that open to their
//      paragraph, form beside them. (InquiryCards.tsx)
export const CONTACT_VARIANT: number = 3
