var App, AppView, MyModel, MyModelView, Todo, TodoList, TodoView, Todos, modelview, mymodel, pubnub, uuid;

uuid = PUBNUB.uuid();

pubnub = PUBNUB.init({
  subscribe_key: 'sub-c-4c7f1748-ced1-11e2-a5be-02ee2ddab7fe',
  publish_key: 'pub-c-6dd9f234-e11e-4345-92c4-f723de52df70',
  uuid: uuid
});

Todo = Backbone.Model.extend({
  defaults: function() {
    return {
      title: "empty todo...",
      order: Todos.nextOrder(),
      done: false
    };
  },
  toggle: function() {
    return this.set({
      done: !this.get('done')
    });
  }
});

TodoList = Backbone.PubNub.Collection.extend({
  model: Todo,
  name: "TodoList",
  pubnub: pubnub,
  constructor: function() {
    return Backbone.PubNub.Collection.apply(this, arguments);
  },
  done: function() {
    return this.where({
      done: true
    });
  },
  remaining: function() {
    return this.without.apply(this, this.done());
  },
  nextOrder: function() {
    if (!this.length) {
      return 1;
    }
    return this.last().get('order') + 1;
  },
  comparator: 'order'
});

Todos = new TodoList;

TodoView = Backbone.View.extend({
  tagName: 'li',
  template: _.template($('#item-template').html()),
  events: {
    'click .toggle': 'toggleDone',
    'dblclick .view': 'edit',
    'click a.destroy': 'clear',
    'keypress .edit': 'updateOnEnter',
    'blur .edit': 'close'
  },
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    return this.listenTo(this.model, 'remove', this.remove);
  },
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    this.$el.toggleClass('done', this.model.get('done'));
    this.input = this.$('.edit');
    return this;
  },
  toggleDone: function() {
    return this.model.toggle();
  },
  edit: function() {
    this.$el.addClass('editing');
    return this.input.focus();
  },
  close: function() {
    var value;
    value = this.input.val();
    if (!value) {
      return this.clear();
    } else {
      this.model.set({
        title: value
      });
      return this.$el.removeClass('editing');
    }
  },
  updateOnEnter: function(event) {
    if (event.keyCode === 13) {
      return this.close();
    }
  },
  clear: function() {
    return Todos.remove(this.model);
  }
});

AppView = Backbone.View.extend({
  el: $('#todoapp'),
  statsTemplate: _.template($('#stats-template').html()),
  events: {
    'keypress #new-todo': 'createOnEnter',
    'click #clear-completed': 'clearCompleted',
    'click #toggle-all': 'toggleAllCompleted'
  },
  initialize: function() {
    this.input = this.$('#new-todo');
    this.allCheckbox = this.$('#toggle-all')[0];
    this.listenTo(Todos, 'add', this.addOne);
    this.listenTo(Todos, 'reset', this.addAll);
    this.listenTo(Todos, 'all', this.render);
    this.footer = this.$('footer');
    return this.main = $('#main');
  },
  render: function() {
    var done, remaining;
    done = Todos.done().length;
    remaining = Todos.remaining().length;
    if (Todos.length) {
      this.main.show();
      this.footer.show();
      this.footer.html(this.statsTemplate({
        done: done,
        remaining: remaining
      }));
    } else {
      this.main.hide();
      this.footer.hide();
    }
    return this.allCheckbox.checked = !remaining;
  },
  addOne: function(todo) {
    var view;
    view = new TodoView({
      model: todo
    });
    return this.$('#todo-list').append(view.render().el);
  },
  addAll: function() {
    return Todos.each(this.addOne, this);
  },
  createOnEnter: function(event) {
    if (event.keyCode !== 13) {
      return;
    }
    if (!this.input.val()) {
      return;
    }
    Todos.add({
      title: this.input.val()
    });
    return this.input.val('');
  },
  clearCompleted: function() {
    _.each(Todos.done(), function(model) {
      return Todos.remove(model);
    });
    return false;
  },
  toggleAllCompleted: function() {
    var done;
    done = this.allCheckbox.checked;
    return Todos.each(function(todo) {
      return todo.set({
        'done': done
      });
    });
  }
});

App = new AppView;

MyModel = Backbone.PubNub.Model.extend({
  name: "MyModel",
  pubnub: pubnub,
  defaults: function() {
    return {
      rand: Math.random(),
      title: "My Model"
    };
  }
});

mymodel = new MyModel;

MyModelView = Backbone.View.extend({
  el: $('#mymodel'),
  template: _.template($('#mymodel-template').html()),
  events: {
    'click #update': 'onUpdateClick'
  },
  initialize: function() {
    this.listenTo(mymodel, 'all', this.render);
    return this.render();
  },
  onUpdateClick: function(event) {
    return mymodel.set({
      rand: Math.random()
    });
  },
  render: function() {
    return this.$el.html(this.template(mymodel.toJSON()));
  }
});

modelview = new MyModelView;

pubnub.subscribe({
  channel: uuid,
  callback: function(message) {
    var data;
    data = message;
    return Todos.set(data);
  },
  connect: function() {
    return pubnub.publish({
      channel: 'getTodos',
      message: {
        uuid: uuid
      }
    });
  }
});
