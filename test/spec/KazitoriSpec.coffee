controller =
  beforeAny: ->
    # console.log 'controller.beforeAny'
  beforeShow: (id) ->
    # console.log 'controller.beforeShow'
  index: ->
    # console.log 'controller.index'
  show: (id) ->
    # console.log "controller.show"
  search: ->
    # console.log "controller.search"

class Router extends Kazitori
  beforeAnytime:["beforeAny"]

  befores:
    '/<int:id>': ['beforeShow']
    '/posts/<int:id>': ['beforeShow']

  routes :
    '/': 'index'
    '/<int:id>': 'show'
    '/posts': 'index'
    '/posts/<int:id>': 'show'
    '/posts/new': 'new'
    '/posts/<int:id>/edit': 'edit'
    '/users/<int:id>/posts/<int:id>':'show'

  index: ->
    controller.index()

  show: (id) ->
    controller.show(id)

  search: ->
    controller.search()

  beforeAny: ->
    controller.beforeAny()

  beforeShow: (id) ->
    controller.beforeShow(id)

@router = new Router()

originalLocation = location.href

describe "Kazitori", ->

  beforeEach ->
    router.change('/')

  afterEach ->
    router.change('/')

  describe "property", ->

    it "should started to be Truthy", ->
      expect(Kazitori.started).toBeTruthy()

    it "test stop and restart", ->
      router.stop()
      expect(Kazitori.started).toBeFalsy()
      router.start()

    xit "test getHash", ->
      location.replace("#{location.origin}/#posts")
      expect(router.getHash()).toEqual 'posts'

    it "test getFragment", ->
      router.change('/posts/1')
      expect(router.getFragment()).toEqual '/posts/1'

    it "test isOldIE", ->
      msie = navigator.appVersion.toLowerCase()
      msie = if msie.indexOf('msie')>-1 then parseInt(msie.replace(/.*msie[ ]/,'').match(/^[0-9]+/)) else 0

      if msie is 0
        expect(router.isOldIE).toBeFalsy()
      else if msie <= 9
        expect(router.isOldIE).toBeTruthy()

  describe "event", ->

    it "should dispatch start event when kazitori started", ->
      startHandlerSpy = jasmine.createSpy('START event')
      router.addEventListener KazitoriEvent.START, startHandlerSpy

      router.stop()
      router.start()
      expect(startHandlerSpy).toHaveBeenCalled()
      expect(startHandlerSpy.calls.length).toEqual(1)

      router.removeEventListener KazitoriEvent.START, startHandlerSpy
      startHandlerSpy.reset()
      router.stop()
      router.start()
      expect(startHandlerSpy).not.toHaveBeenCalled()

    it "should dispatch stop event when kazitori stoped", ->
      stopHandlerSpy = jasmine.createSpy('STOP event')

      router.addEventListener KazitoriEvent.START, stopHandlerSpy
      router.stop()
      expect(stopHandlerSpy).toHaveBeenCalled()
      expect(stopHandlerSpy.calls.length).toEqual(1)

      router.removeEventListener KazitoriEvent.START, stopHandlerSpy
      stopHandlerSpy.reset()
      router.start()
      router.stop()
      expect(stopHandlerSpy).not.toHaveBeenCalled()
      router.start()

    it "should dispatch change events when kazitori changed", ->
      _prev = "/posts"
      _next = "/posts/new"
      router.change("#{_prev}")
      expect(window.location.pathname).toEqual "#{_prev}"

      listener =
        onChange: (e) ->
          console.log 'onChange'
          expect(e.prev).toEqual "#{_prev}"
          expect(e.next).toEqual "#{_next}"
        onInternalChange: (e) ->
          console.log 'onInternalChange'
          expect(e.prev).toEqual "#{_prev}"
          expect(e.next).toEqual "#{_next}"
        onUserChange: (e) ->
          console.log 'onUserChange'
          expect(e.prev).toEqual "#{_prev}"
          expect(e.next).toEqual "#{_next}"

      spyOn(listener, 'onChange').andCallThrough()
      spyOn(listener, 'onInternalChange').andCallThrough()
      spyOn(listener, 'onUserChange').andCallThrough()

      router.addEventListener KazitoriEvent.CHANGE, listener.onChange
      router.addEventListener KazitoriEvent.INTERNAL_CHANGE, listener.onInternalChange
      router.addEventListener KazitoriEvent.USER_CHANGE, listener.onUserChange

      router.change("#{_next}")
      expect(listener.onChange).toHaveBeenCalled()
      expect(listener.onChange.calls.length).toEqual(1)

      expect(listener.onInternalChange).toHaveBeenCalled()
      expect(listener.onInternalChange.calls.length).toEqual(1)

      expect(listener.onUserChange).not.toHaveBeenCalled()

      listener.onChange.reset()
      listener.onInternalChange.reset()
      listener.onUserChange.reset()
      location.replace("#{location.origin}#{_prev}")
      location.replace("#{location.origin}#{_next}")

      expect(listener.onChange).toHaveBeenCalled()
      expect(listener.onChange.calls.length).toEqual(1)

      expect(listener.onInternalChange).not.toHaveBeenCalled()

      expect(listener.onUserChange).toHaveBeenCalled()
      expect(listener.onUserChange.calls.length).toEqual(1)

      router.removeEventListener KazitoriEvent.CHANGE, listener.onChange
      router.removeEventListener KazitoriEvent.INTERNAL_CHANGE, listener.onChange
      router.removeEventListener KazitoriEvent.USER_CHANGE, listener.onChange

      router.change("#{_next}")
      location.replace("#{location.origin}#{_next}")

      listener.onChange.reset()
      listener.onInternalChange.reset()
      listener.onUserChange.reset()

      expect(listener.onChange).not.toHaveBeenCalled()
      expect(listener.onInternalChange).not.toHaveBeenCalled()
      expect(listener.onUserChange).not.toHaveBeenCalled()

      #タスクキューが空になった
      #KazitoriEvent.TASK_QUEUE_COMPLETE

      #タスクキューが中断された
      #KazitoriEvent.TASK_QUEUE_FAILD

      #ユーザーアクション以外で URL の変更があった
      #KazitoriEvent.INTERNAL_CHANGE

      #ユーザー操作によって URL が変わった時
      #KazitoriEvent.USER_CHANGE

      #KazitoriEvent.REJECT

    it "should dispatch prev event when kazitori omokazied", ->
      handlerSpy = jasmine.createSpy('PREV Event')

      router.addEventListener KazitoriEvent.PREV, handlerSpy
      router.omokazi()
      expect(handlerSpy).toHaveBeenCalled()
      expect(handlerSpy.calls.length).toEqual(1)

      router.removeEventListener KazitoriEvent.PREV, handlerSpy
      handlerSpy.reset()
      router.omokazi()
      expect(handlerSpy).not.toHaveBeenCalled()
      router.torikazi()

    it "should dispatch prev event when kazitori torikazied", ->
      handlerSpy = jasmine.createSpy('NEXT Event')

      router.addEventListener KazitoriEvent.NEXT, handlerSpy
      router.torikazi()
      expect(handlerSpy).toHaveBeenCalled()
      expect(handlerSpy.calls.length).toEqual(1)

      router.removeEventListener KazitoriEvent.NEXT, handlerSpy
      handlerSpy.reset()
      router.torikazi()
      expect(handlerSpy).not.toHaveBeenCalled()

    it "should dispatch not_found event when kazitori router undefined", ->
      handlerSpy = jasmine.createSpy('NOT_FOUND Event')

      router.addEventListener KazitoriEvent.NOT_FOUND, handlerSpy
      router.change("/hageeeeeee")
      expect(handlerSpy).toHaveBeenCalled()
      expect(handlerSpy.calls.length).toEqual(1)

      router.removeEventListener KazitoriEvent.NOT_FOUND, handlerSpy
      handlerSpy.reset()
      router.change("/hogeeeeeee")
      expect(handlerSpy).not.toHaveBeenCalled()

  xit "test routes (simple)", ->
    location.replace("#{location.origin}/posts/1")
    expect(window.location.pathname).toEqual '/posts/1'

  it "can be change location (simple)", ->
    router.change('/posts/1')
    expect(window.location.pathname).toEqual '/posts/1'

  it "can be change location (two part)", ->
    router.change('/users/3/posts/1')
    expect(window.location.pathname).toEqual '/users/3/posts/1'

  describe "with controller", ->

    # beforeEach ->

    it 'index should be called', ->
      spyOn(controller, 'index')
      router.change('/posts')
      expect(controller.index).toHaveBeenCalled()

    it 'show should be called', ->
      spyOn(controller, 'show')
      router.change('/posts/1')
      expect(controller.show).toHaveBeenCalled()

    it 'show should be called with casted argments', ->
      spyOn(controller, 'show')
      router.change('/posts/32941856')
      expect(controller.show).toHaveBeenCalledWith(32941856)

    it 'befores should be before called', ->
      spyOn(controller, 'beforeShow')
      router.change('/posts/1')
      expect(controller.beforeShow).toHaveBeenCalled()

    it 'show should be called with casted argments', ->
      spyOn(controller, 'beforeShow')
      router.change('/posts/32941856')
      expect(controller.beforeShow).toHaveBeenCalledWith(32941856)

    it 'beforeAny should be before called', ->
      spyOn(controller, 'beforeAny')
      router.change('/posts')
      expect(controller.beforeAny).toHaveBeenCalled()
      router.change('/posts/1')
      expect(controller.beforeAny).toHaveBeenCalled()

  # describe "Asynchronous specs", ->
  #   value = null
  #   flag = null

  #   it "should support async execution of test preparation and exepectations", ->

  #     runs ->
  #       flag = false
  #       value = 0

  #       setTimeout ->
  #         flag = true
  #       , 500

  #     waitsFor ->
  #       value++
  #       flag
  #     , "The Value should be incremented", 750

  #     runs ->
  #       expect(value).toBeGreaterThan(0)
