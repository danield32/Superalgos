
function newConditionEditor () {
  const MODULE_NAME = 'Condition Editor'

  let thisObject = {
    isVisibleFunction: undefined,
    visible: false,
    imagePathOK: undefined,
    imagePathNOT_OK: undefined,
    container: undefined,
    payload: undefined,
    deactivate: deactivate,
    activate: activate,
    physics: physics,
    drawBackground: drawBackground,
    drawForeground: drawForeground,
    getContainer: getContainer,
    finalize: finalize,
    initialize: initialize
  }

  thisObject.container = newContainer()
  thisObject.container.initialize(MODULE_NAME, 'Circle')
  thisObject.container.isClickeable = false
  thisObject.container.isDraggeable = false
  thisObject.container.detectMouseOver = false
  thisObject.container.frame.radius = 750
  thisObject.container.frame.containerName = MODULE_NAME

  let isMouseOver = false
  let operationPicker
  let operatorA
  let operatorB

  return thisObject

  function finalize () {
    thisObject.container.finalize()
    thisObject.container = undefined
    thisObject.payload = undefined
    thisObject.isVisibleFunction = undefined

    operationPicker = undefined
    operatorA = undefined
    operatorB = undefined
  }

  function initialize () {

  }

  function deactivate () {
    convertToCode()
    finalizePickers()

    if (thisObject.visible === true) {
      thisObject.visible = false
    }
    EDITOR_ON_FOCUS = false
  }

  function convertToCode () {
    if (operatorA === undefined || operatorB === undefined || operationPicker === undefined) { return }

    // chart.at01hs.bollingerSubChannel.previous.previous.slope=== "Extreme"
    let code = ''

    code = code + 'chart.at' + operatorA.timeFramePicker.getValue().replace('-', '')
    code = code + '.' + operatorA.productPicker.getValue()
    code = code + '.' + operatorA.propertyPicker.getValue()

    switch (operationPicker.getValue()) {
      case 'Greater Than': {
        code = code + ' > '
        break
      }
      case 'Less Than': {
        code = code + ' < '
        break
      }
      case 'Greater or Equal Than': {
        code = code + ' >= '
        break
      }
      case 'Less or Equal Than': {
        code = code + ' <= '
        break
      }
      case 'Equal To': {
        code = code + ' === '
        break
      }
    }

    if (operationPicker.getValue() === 'Equal To') {
      code = code + '"' + operatorA.valuePicker.getValue() + '"'
    } else {
      code = code + 'chart.at' + operatorB.timeFramePicker.getValue().replace('-', '')
      code = code + '.' + operatorB.productPicker.getValue()
      code = code + '.' + operatorB.propertyPicker.getValue()
    }

    thisObject.payload.node.code = code
  }

  function activate (payload) {
    thisObject.visible = true
    thisObject.payload = payload
    thisObject.payload.uiObject.setErrorMessage('', 0)

    operatorA = {}
    operatorB = {}
    scanDataMines()
    initializePickers()
    EDITOR_ON_FOCUS = true
  }

  function scanDataMines () {
    let selector = {}

    let workspace = canvas.designSpace.workspace.workspaceNode

    for (let i = 0; i < workspace.rootNodes.length; i++) {
      let rootNode = workspace.rootNodes[i]
      if (rootNode.type !== 'Data Mine') { continue }
      let dataMine = rootNode
      let dataMineName = loadPropertyFromNodeConfig(dataMine.payload, 'codeName')
      selector[dataMineName] = {}
      let bots = dataMine.sensorBots.concat(dataMine.indicatorBots)
      for (let j = 0; j < bots.length; j++) {
        let bot = bots[j]
        let botName = loadPropertyFromNodeConfig(bot.payload, 'codeName')
        let selectorDataMine = selector[dataMineName]
        selectorDataMine[botName] = {}
        for (let k = 0; k < bot.products.length; k++) {
          let product = bot.products[k]
          let productName = loadPropertyFromNodeConfig(product.payload, 'singularVariableName')
          if (productName === undefined) { continue }
          let selectorProduct = selectorDataMine[botName]
          selectorProduct[productName] = {
            properties: {}
          }
          if (product.record === undefined) { continue }
          for (let m = 0; m < product.record.properties.length; m++) {
            let property = product.record.properties[m]
            let propertyName = loadPropertyFromNodeConfig(property.payload, 'codeName')
            let selectorProperty = selectorProduct[productName]
            selectorProperty = selectorProperty.properties
            selectorProperty[propertyName] = {}
            let possibleValues = loadPropertyFromNodeConfig(property.payload, 'possibleValues')
            if (possibleValues === undefined) { possibleValues = [] }
            let selectorPossibleValue = selectorProperty[propertyName]
            selectorPossibleValue.possibleValues = possibleValues
          }
          let allPossibleTimeFrames = []
          for (let m = 0; m < product.datasets.length; m++) {
            let dataset = product.datasets[m]
            let validTimeFrames = loadPropertyFromNodeConfig(dataset.payload, 'validTimeFrames')
            if (validTimeFrames !== undefined) {
              allPossibleTimeFrames = allPossibleTimeFrames.concat(validTimeFrames)
            }
          }
          let selectorValidTimeFrames = selectorProduct[productName]
          selectorValidTimeFrames.validTimeFrames = allPossibleTimeFrames

          let productKeys = Object.keys(selectorProduct[productName])
          if (productKeys.length === 0) {
            selectorProduct[productName] = undefined
          }
        }
        let botKeys = Object.keys(selectorDataMine[botName])
        if (botKeys.length === 0) {
          selectorDataMine[botName] = undefined
        }
      }
      let dataMineKeys = Object.keys(selector[dataMineName])
      if (dataMineKeys.length === 0) {
        selector[dataMineName] = undefined
      }
    }
    operatorA.selector = JSON.parse(JSON.stringify(selector))
    operatorB.selector = JSON.parse(JSON.stringify(selector))
  }

  function initializePickers () {
    initializeOperator(operatorA, -1)
    initializeOperator(operatorB, 1)

    operationPicker = newPicker()
    operationPicker.name = 'Data Mine'
    operationPicker.container.connectToParent(thisObject.container)
    operationPicker.container.frame.position.x = 0 - operationPicker.container.frame.width / 2
    operationPicker.container.frame.position.y = 0 - operationPicker.container.frame.height / 2
    current = ['Greater Than', 'Less Than', 'Greater or Equal Than', 'Less or Equal Than', 'Equal To']
    operationPicker.initialize(current, current)

    operationPicker.eventSuscriptionId = operationPicker.container.eventHandler.listenToEvent('onParentChanged', onParentChanged)
  }

  function initializeOperator (operator, ySign) {
    let properties
    let parent
    let current

    operator.dataMinePicker = newPicker()
    operator.dataMinePicker.name = 'Data Mine'
    operator.dataMinePicker.container.connectToParent(thisObject.container)
    operator.dataMinePicker.container.frame.position.x = 0 - operator.dataMinePicker.container.frame.width / 2 - operator.dataMinePicker.container.frame.width * 2
    operator.dataMinePicker.container.frame.position.y = 0 - operator.dataMinePicker.container.frame.height / 2 + operator.dataMinePicker.container.frame.height * ySign
    current = operator.selector
    properties = Object.keys(current)
    operator.dataMinePicker.initialize(properties, current)
    parent = current
    operator.dataMinePicker.visible = true

    operator.botPicker = newPicker()
    operator.botPicker.name = 'Bot'
    operator.botPicker.container.connectToParent(thisObject.container)
    operator.botPicker.container.frame.position.x = 0 - operator.botPicker.container.frame.width / 2 - operator.botPicker.container.frame.width * 1
    operator.botPicker.container.frame.position.y = 0 - operator.botPicker.container.frame.height / 2 + operator.dataMinePicker.container.frame.height * ySign
    current = parent[properties[0]]
    properties = Object.keys(current)
    operator.botPicker.initialize(properties, current, parent)
    parent = current
    operator.botPicker.visible = true

    operator.productPicker = newPicker()
    operator.productPicker.name = 'Product'
    operator.productPicker.container.connectToParent(thisObject.container)
    operator.productPicker.container.frame.position.x = 0 - operator.productPicker.container.frame.width / 2 - operator.productPicker.container.frame.width * 0
    operator.productPicker.container.frame.position.y = 0 - operator.productPicker.container.frame.height / 2 + operator.dataMinePicker.container.frame.height * ySign
    current = parent[properties[0]]
    properties = Object.keys(current)
    operator.productPicker.initialize(properties, current, parent)
    parent = current
    operator.productPicker.visible = true

    let productParent = parent
    let productProperties = properties

    operator.propertyPicker = newPicker()
    operator.propertyPicker.name = 'Property'
    operator.propertyPicker.container.connectToParent(thisObject.container)
    operator.propertyPicker.container.frame.position.x = 0 - operator.propertyPicker.container.frame.width / 2 + operator.propertyPicker.container.frame.width * 1
    operator.propertyPicker.container.frame.position.y = 0 - operator.propertyPicker.container.frame.height / 2 + operator.dataMinePicker.container.frame.height * ySign
    current = productParent[productProperties[0]]
    current = current.properties
    properties = Object.keys(current)
    operator.propertyPicker.initialize(properties, current, productParent, 'properties')
    parent = current
    operator.propertyPicker.visible = true

    operator.valuePicker = newPicker()
    operator.valuePicker.name = 'Value'
    operator.valuePicker.container.connectToParent(thisObject.container)
    operator.valuePicker.container.frame.position.x = 0 - operator.valuePicker.container.frame.width / 2
    operator.valuePicker.container.frame.position.y = 0 - operator.valuePicker.container.frame.height / 2 + operator.valuePicker.container.frame.height * 1
    current = parent[properties[0]]
    properties = current.possibleValues
    operator.valuePicker.initialize(properties, current, parent, 'possibleValues')
    parent = current
    operator.valuePicker.visible = false

    operator.timeFramePicker = newPicker()
    operator.timeFramePicker.name = 'Time Frame'
    operator.timeFramePicker.container.connectToParent(thisObject.container)
    operator.timeFramePicker.container.frame.position.x = 0 - operator.timeFramePicker.container.frame.width / 2 + operator.timeFramePicker.container.frame.width * 2
    operator.timeFramePicker.container.frame.position.y = 0 - operator.timeFramePicker.container.frame.height / 2 + operator.timeFramePicker.container.frame.height * ySign
    current = productParent[productProperties[0]]
    properties = current.validTimeFrames
    operator.timeFramePicker.initialize(properties, current, productParent, 'validTimeFrames')
    parent = current
    operator.timeFramePicker.visible = true

    operator.botPicker.eventSuscriptionId = operator.dataMinePicker.container.eventHandler.listenToEvent('onParentChanged', operator.botPicker.onParentChanged)
    operator.productPicker.eventSuscriptionId = operator.botPicker.container.eventHandler.listenToEvent('onParentChanged', operator.productPicker.onParentChanged)
    operator.propertyPicker.eventSuscriptionId = operator.productPicker.container.eventHandler.listenToEvent('onParentChanged', operator.propertyPicker.onParentChanged)
    operator.valuePicker.eventSuscriptionId = operator.propertyPicker.container.eventHandler.listenToEvent('onParentChanged', operator.valuePicker.onParentChanged)
    operator.timeFramePicker.eventSuscriptionId = operator.productPicker.container.eventHandler.listenToEvent('onParentChanged', operator.timeFramePicker.onParentChanged)
  }

  function finalizePickers () {
    finalizeOperator(operatorA)
    finalizeOperator(operatorB)

    operatorA = undefined
    operatorB = undefined

    if (operationPicker !== undefined) {
      operationPicker.container.eventHandler.stopListening(operationPicker.eventSuscriptionId)
      operationPicker.finalize()
      operationPicker = undefined
    }
  }

  function finalizeOperator (operator) {
    if (operator === undefined) { return }
    if (operator.dataMinePicker !== undefined) {
      operator.dataMinePicker.container.eventHandler.stopListening(operator.botPicker.eventSuscriptionId)
      operator.dataMinePicker.finalize()
      operator.dataMinePicker = undefined
    }

    if (operator.botPicker !== undefined) {
      operator.botPicker.container.eventHandler.stopListening(operator.productPicker.eventSuscriptionId)
      operator.botPicker.finalize()
      operator.botPicker = undefined
    }

    if (operator.productPicker !== undefined) {
      operator.productPicker.container.eventHandler.stopListening(operator.propertyPicker.eventSuscriptionId)
      operator.productPicker.container.eventHandler.stopListening(operator.timeFramePicker.eventSuscriptionId)
      operator.productPicker.finalize()
      operator.productPicker = undefined
    }

    if (operator.propertyPicker !== undefined) {
      operator.propertyPicker.container.eventHandler.stopListening(operator.valuePicker.eventSuscriptionId)
      operator.propertyPicker.finalize()
      operator.propertyPicker = undefined
    }

    if (operator.valuePicker !== undefined) {
      operator.valuePicker.finalize()
      operator.valuePicker = undefined
    }

    if (operator.timeFramePicker !== undefined) {
      operator.timeFramePicker.finalize()
      operator.timeFramePicker = undefined
    }
  }

  function onParentChanged (event) {
    if (event.selected === 4) { // this means Equal To
      operatorA.valuePicker.visible = true
      operatorB.dataMinePicker.visible = false
      operatorB.botPicker.visible = false
      operatorB.productPicker.visible = false
      operatorB.propertyPicker.visible = false
      operatorB.timeFramePicker.visible = false
    } else {
      operatorA.valuePicker.visible = false
      operatorB.dataMinePicker.visible = true
      operatorB.botPicker.visible = true
      operatorB.productPicker.visible = true
      operatorB.propertyPicker.visible = true
      operatorB.timeFramePicker.visible = true
    }
  }

  function getContainer (point) {
    let container
    if (thisObject.visible === true) {
      if (operationPicker !== undefined) {
        container = operationPicker.getContainer(point)
        if (container !== undefined) { return container }
      }

      if (operatorA !== undefined) {
        if (operatorA.dataMinePicker !== undefined) {
          if (operatorA.dataMinePicker.visible === true) {
            container = operatorA.dataMinePicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorA.botPicker !== undefined) {
          if (operatorA.botPicker.visible === true) {
            container = operatorA.botPicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorA.productPicker !== undefined) {
          if (operatorA.productPicker.visible === true) {
            container = operatorA.productPicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorA.propertyPicker !== undefined) {
          if (operatorA.propertyPicker.visible === true) {
            container = operatorA.propertyPicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorA.valuePicker !== undefined) {
          if (operatorA.valuePicker.visible === true) {
            container = operatorA.valuePicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorA.timeFramePicker !== undefined) {
          if (operatorA.timeFramePicker.visible === true) {
            container = operatorA.timeFramePicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }
      }
      if (operatorB !== undefined) {
        if (operatorB.dataMinePicker !== undefined) {
          if (operatorB.dataMinePicker.visible === true) {
            container = operatorB.dataMinePicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorB.botPicker !== undefined) {
          if (operatorB.botPicker.visible === true) {
            container = operatorB.botPicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorB.productPicker !== undefined) {
          if (operatorB.productPicker.visible === true) {
            container = operatorB.productPicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorB.propertyPicker !== undefined) {
          if (operatorB.propertyPicker.visible === true) {
            container = operatorB.propertyPicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorB.valuePicker !== undefined) {
          if (operatorB.valuePicker.visible === true) {
            container = operatorB.valuePicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }

        if (operatorB.timeFramePicker !== undefined) {
          if (operatorB.timeFramePicker.visible === true) {
            container = operatorB.timeFramePicker.getContainer(point)
            if (container !== undefined) { return container }
          }
        }
      }

      if (thisObject.container.frame.isThisPointHere(point, true) === true) {
        return thisObject.container
      } else {
        return undefined
      }
    }
  }

  function physics () {
    thisObjectphysics()
    operatorsPhysics(operatorA)
    operatorsPhysics(operatorB)

    if (operationPicker !== undefined) {
      operationPicker.physics()
    }
  }

  function selectionPhysics () {

  }

  function operatorsPhysics (operator) {
    if (operator === undefined) { return }

    if (operator.dataMinePicker !== undefined) {
      operator.dataMinePicker.physics()
    }

    if (operator.botPicker !== undefined) {
      operator.botPicker.physics()
    }

    if (operator.productPicker !== undefined) {
      operator.productPicker.physics()
    }

    if (operator.propertyPicker !== undefined) {
      operator.propertyPicker.physics()
    }

    if (operator.valuePicker !== undefined) {
      operator.valuePicker.physics()
    }

    if (operator.timeFramePicker !== undefined) {
      operator.timeFramePicker.physics()
    }
  }

  function thisObjectphysics () {

  }

  function drawBackground () {
    thisObjectDrawBackground()
    childrenDrawBackground()
  }

  function childrenDrawBackground () {
    operatorDrawBackground(operatorA)
    operatorDrawBackground(operatorB)

    if (operationPicker !== undefined) {
      operationPicker.drawBackground()
    }
  }

  function operatorDrawBackground (operator) {
    if (operator === undefined) { return }

    if (operator.dataMinePicker !== undefined) {
      if (operator.dataMinePicker.visible === true) {
        operator.dataMinePicker.drawBackground()
      }
    }

    if (operator.botPicker !== undefined) {
      if (operator.botPicker.visible === true) {
        operator.botPicker.drawBackground()
      }
    }

    if (operator.productPicker !== undefined) {
      if (operator.productPicker.visible === true) {
        operator.productPicker.drawBackground()
      }
    }

    if (operator.propertyPicker !== undefined) {
      if (operator.propertyPicker.visible === true) {
        operator.propertyPicker.drawBackground()
      }
    }

    if (operator.valuePicker !== undefined) {
      if (operator.valuePicker.visible === true) {
        operator.valuePicker.drawBackground()
      }
    }

    if (operator.timeFramePicker !== undefined) {
      if (operator.timeFramePicker.visible === true) {
        operator.timeFramePicker.drawBackground()
      }
    }
  }

  function thisObjectDrawBackground () {
    if (thisObject.visible === true) {
      let position = {
        x: 0,
        y: 0
      }

      position = thisObject.container.frame.frameThisPoint(position)

      let radius = thisObject.container.frame.radius

      browserCanvasContext.beginPath()
      browserCanvasContext.arc(position.x, position.y, radius + 3, 0, Math.PI * 2, true)
      browserCanvasContext.closePath()
      browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.WHITE + ', ' + 1 + ')'
      browserCanvasContext.fill()

      browserCanvasContext.beginPath()
      browserCanvasContext.arc(position.x, position.y, radius, 0, Math.PI * 2, true)
      browserCanvasContext.closePath()
      browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GREY + ', ' + 1 + ')'
      browserCanvasContext.fill()
    }
  }

  function drawForeground () {
    thisObjectDrawForeground()
    childrenDrawForeground()
  }

  function childrenDrawForeground () {
    operatorDrawForeground(operatorA)
    operatorDrawForeground(operatorB)

    if (operationPicker !== undefined) {
      operationPicker.drawForeground()
    }
  }

  function operatorDrawForeground (operator) {
    if (operator === undefined) { return }

    if (operator.dataMinePicker !== undefined) {
      if (operator.dataMinePicker.visible === true) {
        operator.dataMinePicker.drawForeground()
      }
    }

    if (operator.botPicker !== undefined) {
      if (operator.botPicker.visible === true) {
        operator.botPicker.drawForeground()
      }
    }

    if (operator.productPicker !== undefined) {
      if (operator.productPicker.visible === true) {
        operator.productPicker.drawForeground()
      }
    }

    if (operator.propertyPicker !== undefined) {
      if (operator.propertyPicker.visible === true) {
        operator.propertyPicker.drawForeground()
      }
    }

    if (operator.valuePicker !== undefined) {
      if (operator.valuePicker.visible === true) {
        operator.valuePicker.drawForeground()
      }
    }

    if (operator.timeFramePicker !== undefined) {
      if (operator.timeFramePicker.visible === true) {
        operator.timeFramePicker.drawForeground()
      }
    }
  }

  function thisObjectDrawForeground () {

  }
}
