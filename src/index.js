// 要生成一个个这样的element给react去识别渲染
const element = {
  type: "text",
  props: {
    children: "test"
  }
};

// 通过这个函数来解析jsx然后生成一个个element对象
function createElement(type, props, ...children) {
  return {
    type: type,
    props: {
      ...props,
      children: children.map((v, i) => {
        return typeof v === "object" ? v : createTextNodex(v);
      })
    }
  };
}

function createTextNodex(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      children: [],
      nodeValue: text
    }
  };
}

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = [];

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
  nextUnitOfWork = wipRoot;
  deletions = [];
}

function createDom(element) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);
  updateDom(dom, {}, element.props || {});
  return dom;
}

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);
function updateDom(dom, prevProps, newProps) {
  // 删除旧的事件监听
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in newProps) || isNew(prevProps, newProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 删除旧props
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, newProps))
    .forEach((name) => {
      dom[name] = "";
    });

  // 更新props
  Object.keys(newProps)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = newProps[name];
    });

  // 添加事件
  Object.keys(newProps)
    .filter(isEvent)
    .filter(isNew(prevProps, newProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, newProps[name]);
    });
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;

  let domParentFiber = fiber.parent;

  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  console.log(domParentFiber, "domParentFiber");
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function performUnitOfWork(fiber) {
  console.log(fiber);
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
}

function updateFunctionComponent(fiber) {
  console.log(fiber, "this is a function compnent");
  const children = [fiber.type(fiber.props)];
  console.log(children, "function children");
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

// 这一步其实就是遍历这个父节点下的所有子节点并对其产生diff运算，且维护其对应的链表结构
// 生成这一层级的fiber树
function reconcileChildren(wipFiber, elements) {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  elements.forEach((element, index) => {
    let newFiber;
    const sameType = oldFiber && element && element.type === oldFiber.type;
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT"
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
  });
}

// 解析过jsx之后，就可以根据我们的渲染规则去渲染dom
const lireact = {
  createElement,
  render
};

/** @jsx lireact.createElement */
const ele = (
  <div>
    <div>test</div>
    <div>test</div>
  </div>
);

const Fun = function (props) {
  return (
    <div>
      <div>test</div>
      <div>test</div>
    </div>
  );
};

const container = document.getElementById("app");
lireact.render(<Fun />, container);
