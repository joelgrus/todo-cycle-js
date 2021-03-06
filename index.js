import Rx from 'rx';
import Cycle from '@cycle/core';
import {div, span, input, p, button, makeDOMDriver} from '@cycle/dom';
import {Record, List} from 'immutable';

// An "enum" for the three filter types.
const FILTER = {
  ALL: "all",
  COMPLETED: "completed",
  UNCOMPLETED: "uncompleted"
}

// intent takes the sources (which here is just the DOM driver) and produces
// the observable$ corresponding to DOM-interaction-generated actions
function intent(sources) {
  const { DOM } = sources;

  // Whenever the .new-todo input value changes (and is non empty), emit it as
  // an addTodo action.
  const addTodoAction$ = DOM.select('.new-todo').events('change')
    .map(e => e.target.value)
    .filter(text => text.trim());

  // For each click on one of the .remove-todo spans, emit its id
  // (which is the List index of that todo) as a removeTodo action.
  const removeTodoAction$ = DOM.select('.remove-todo').events('click')
    .map(ev => ev.target['data-todo-id']);

  // For each click on a .todo-completed checkbox, emit its id
  // (which is the List index of that todo) as a todoCompleted action.
  const todoCompletedAction$ = DOM.select('.todo-completed').events('click')
    .map(ev => ev.target['data-todo-id']);

  // For each click on one of the .filter labels, emit its id
  // (which is the value of that filter enum) as a changeFilter action.
  const changeFilterAction$ = DOM.select('.filter').events('click')
    .map(ev => ev.target.id);

  // For each click on the .clear-completed button, emit something.
  const clearCompletedAction$ = DOM.select('.clear-completed').events('click');

  // Just return an object with all the actions in it.
  return {addTodoAction$,
          removeTodoAction$,
          todoCompletedAction$,
          changeFilterAction$,
          clearCompletedAction$};
}

// Our state consists of a List of todos and a filter selection.
const State = Record({ todos: List(), todoFilter: FILTER.ALL });

// A todo is simply some text and a completed flag.
const Todo = Record({ text: "", completed: false});

// Our model turns each action observable into an observable of state
// transformations (i.e. functions state => state), then merges the
// transformation observable$ and `scan`s them over the starting state.
function model(actions) {

  // An addTodoAction is just the text of the new todo, so the corresponding
  // transformation just pushes the new todo onto the front of the todos list.
  const addTodo$ = actions.addTodoAction$
    .map(text => function addTodo(state) {
      return state.updateIn(['todos'], todos => todos.unshift(new Todo({text})));
    });

  // A removeTodoAction is just the key (in the todos List) of the todo to
  // remove, so the transformation just calls List.delete for that key.
  const removeTodo$ = actions.removeTodoAction$
    .map(todoId => function removeTodo(state) {
      return state.updateIn(['todos'], todos => todos.delete(todoId))
    });

  // A todoCompletedAction is just the key (in the todos List) of the todo whose
  // checkbox was clicked, so we just toggle `completed` for that todo.
  const todoCompleted$ = actions.todoCompletedAction$
    .map(todoId => function todoCompleted(state) {
      return state.updateIn(['todos'], todos =>
        todos.update(todoId, todo => todo.update('completed', x => !x))
      );
    });

  // A changeFilterAction is the just the value of the chosen filter enum, so
  // we just need to set state.todoFilter to that value.
  const changeFilter$ = actions.changeFilterAction$
    .map(todoFilter => function changeFilter(state) {
      return state.set('todoFilter', todoFilter);
    });

  // A clearCompletedAction contains no data, it just tells us to remove all
  // the completed todos from the list.
  const clearCompleted$ = actions.clearCompletedAction$
    .map(() => function clearCompleted(state) {
      return state.updateIn(['todos'], todos =>
        todos.filter(todo => !todo.get('completed')));
    });

  // Merge the streams of state transformations, and accumulate them starting
  // with initialState.
  return Rx.Observable.merge(
    addTodo$, removeTodo$, todoCompleted$, changeFilter$, clearCompleted$)
    .startWith(new State())
    .scan((state, transform) => transform(state));
}

// Test whether a todo passes the specified filterType.
function todoFilter(filterType) {
  return todo => {
    switch (filterType) {
      case FILTER.ALL: return true;
      case FILTER.COMPLETED: return todo.get('completed');
      case FILTER.UNCOMPLETED: return !todo.get('completed');
      default: return false;
    }
  }
}

function filterSelector(activeFilter, targetFilter) {
  var active = activeFilter === targetFilter ? ".active" : "";
  // id should be the filterName
  // class should be "filter" and also "active" if it's the active filter
  return `#${targetFilter}.filter${active}`;
}

// Each filterType gets a SPAN#filterType.filter.{active?}
function renderFilters(activeFilter) {
  return div([
    span(filterSelector(activeFilter, FILTER.ALL), " ALL "),
    span(filterSelector(activeFilter, FILTER.COMPLETED), " COMPLETED "),
    span(filterSelector(activeFilter, FILTER.UNCOMPLETED), " UNCOMPLETED "),
  ]);
}

// No formatting here, just display the text, then a checkbox for completed,
// and finally an 'x' to remove the todo.
function renderTodo(idx, todo) {
  return div([
    span(todo.get('text')),
    input(".todo-completed",
          { type: 'checkbox', checked : todo.get('completed'), 'data-todo-id' : idx }),
    span(".remove-todo", {'data-todo-id' : idx}, " x")
  ])
}

function renderTodos(todos, activeFilter) {
  return div(todos                                 // start with the todos
    .filter(todoFilter(activeFilter))              // apply the selected filter
    .entrySeq()                                    // get the entries
    .map(([idx, todo]) => renderTodo(idx, todo))   // render each idx, todo pair
    .toArray()                                     // return as array
  )
}

// Render the state, which is just a filter choice and a List of todos.
function view(state$) {
  return state$.map(state => {
    return div([
      renderFilters(state.get('todoFilter')),
      input(".new-todo", {type: 'text', value: ''}),
      button(".clear-completed", "Clear Completed"),
      renderTodos(state.get('todos'), state.get('todoFilter'))
    ])
  });
}

function main(sources) {
  var sinks =  { DOM: view(model(intent(sources)))};
  return sinks;
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app')
});
