export default function pipe(...transformers) {
  let outputs = [];

  function sendToSubscribers(...args) {
    for (let i = 0, l = outputs.length; i < l; i++) {
      outputs[i](...args);
    }
  }

  let send;

  function createTransformerPipeline() {
    send = sendToSubscribers;
    for (let l = transformers.length; l; l--) {
      send = transformers[l - 1](send);
    }
  }

  createTransformerPipeline();

  let self = {
    __pipe: true,
    connect(fn) {
      outputs.push(fn);

      return function () {
        outputs.splice(outputs.indexOf(fn), 1);
      };
    },
    send(...args) {
      send(...args);
    },
    extend(...fns) {
      let p = pipe(...fns);
      self.connect(p.send);
      return p;
    },
    push(...newTransformers) {
      transformers.push(...newTransformers);
      createTransformerPipeline();
    },
    unshift(...newTransformers) {
      transformers.unshift(...newTransformers);
      createTransformerPipeline();
    },
    pop(i) {
      let popped;

      if (i == null) {
        popped = transformers.pop();
      }
      else {
        popped = transformers[i];
        transformers.splice(i, 1);
      }

      createTransformerPipeline();

      return popped;
    },
    shift() {
      let shifted = transformers.shift();
      createTransformerPipeline();
      return shifted;
    },
    remove(transformer) {
      let i = transformers.indexOf(transformer);

      while (i >= 0) {
        transformers.splice(i, 1);
        i = transformers.indexOf(transformer);
      }

      createTransformerPipeline();
    },
  };

  return self;
};
