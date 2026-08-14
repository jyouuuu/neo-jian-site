// ===========================================================================
//  HAND-EDITED. Unlike the other files in here, nothing generates this one.
//  THIS IS THE ONLY FILE YOU TOUCH WHEN SLOTS MOVE. Change `taken` and save.
//
//      taken: 0   all five free
//      taken: 3   two left
//      taken: 5   FULL — the commissions page swaps the order form for the
//                 waitlist by itself, and every COMMS button says FULL
//
//  Everything follows from that one number: the scrolling strip, the 2/5
//  badge, the COMMS button in the nav on every page, and whether people can
//  order or join the waitlist.
//
//  You never have to touch the DATE. "Slots open the 1st", so the next batch
//  is always the 1st of the coming month and the page works it out itself —
//  it can't sit there advertising a date that's already gone by.
// ===========================================================================
window.JIAN_SLOTS = {
  taken: 3,
  total: 5,
};
