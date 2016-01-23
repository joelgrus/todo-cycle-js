# todos in cycle.js

A simple todomvc-style app built using cycle.js (and Immutable.js).
Not intended to look good (or to meet the actual todomvc spec), just to get
the basic design and functionality correct.

It should be relatively straightforward, the only really "cute" thing I did
was to use the Immutable.List indices as `data-todo-id` elements, which made it
dead simple to implement "delete" and "toggle completed".

(Originally I didn't use Immutable, but about halfway through I realized it
would make the code a *lot* simpler.)
