/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 320:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 745:
/***/ ((module) => {

module.exports = eval("require")("@aws-sdk/client-ssm");


/***/ }),

/***/ 198:
/***/ ((module) => {

module.exports = eval("require")("tmp");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__nccwpck_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__nccwpck_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__nccwpck_require__.r(__webpack_exports__);

;// CONCATENATED MODULE: external "fs"
const external_fs_namespaceObject = require("fs");
var external_fs_default = /*#__PURE__*/__nccwpck_require__.n(external_fs_namespaceObject);
// EXTERNAL MODULE: ../../../../opt/homebrew/lib/node_modules/@vercel/ncc/dist/ncc/@@notfound.js?tmp
var _notfoundtmp = __nccwpck_require__(198);
var _notfoundtmp_default = /*#__PURE__*/__nccwpck_require__.n(_notfoundtmp);
;// CONCATENATED MODULE: external "path"
const external_path_namespaceObject = require("path");
var external_path_default = /*#__PURE__*/__nccwpck_require__.n(external_path_namespaceObject);
;// CONCATENATED MODULE: external "fs/promises"
const promises_namespaceObject = require("fs/promises");
// EXTERNAL MODULE: ../../../../opt/homebrew/lib/node_modules/@vercel/ncc/dist/ncc/@@notfound.js?@aws-sdk/client-ssm
var client_ssm = __nccwpck_require__(745);
;// CONCATENATED MODULE: ./index.js




const core = __nccwpck_require__(320);


const region = process.env.AWS_REGION;
const ssmClient = new client_ssm.SSMClient({ region });

const loadTaskDefinitionAsJsObject = async () => {
  const taskDefinitionFileName = core.getInput('task-definition', { required: true });

  const taskDefPath = external_path_default().isAbsolute(taskDefinitionFileName) ?
    taskDefinitionFileName : external_path_default().join(process.env.GITHUB_WORKSPACE, taskDefinitionFileName);

  if (!external_fs_default().existsSync(taskDefPath)) {
    throw new Error(`Task definition file does not exist: ${taskDefinitionFileName}`);
  }

  const taskDefinitionContent = await (0,promises_namespaceObject.readFile)(taskDefPath);
  return JSON.parse(taskDefinitionContent);
}

const findContainerDefinition = (taskDefinition) => {
  const containerName = core.getInput('container-name', { required: true });
  const containerDefinition = taskDefinition.containerDefinitions.find(definition => definition.name === containerName);

  if (!containerDefinition) {
    throw new Error('Invalid task definition: Could not find container definition with matching name');
  }

  return containerDefinition;
}

const normalizeEnvVarName = (ssmParam) => ssmParam.Name.split("/").reverse()[0];

const convertToTaskDefinitionEnvironment = (ssmParam) => ({
  name: normalizeEnvVarName(ssmParam),
  value: ssmParam.Value
});

const convertToTaskDefinitionSecret = (ssmParam) => ({
  name: normalizeEnvVarName(ssmParam),
  valueFrom: ssmParam.ARN
});

const loadParamsFromAWS = async (Path, NextPage = null) => {
  const { Parameters, NextToken } = await ssmClient.send(new client_ssm.GetParametersByPathCommand({
    Path,
    NextToken: NextPage
  }));

  if (NextToken) {
    const moreParams = await loadParamsFromAWS(Path, NextToken);
    return [...Parameters, ...moreParams];
  }

  return Parameters;
}

const loadSSMParamsGroupingByPrecedence = async (ssmParamPaths) => {
  const ssmParamPathsList = ssmParamPaths.split(',').map((ssmParamPath) => ssmParamPath.trim())

  const listOfSsmParams = []
  for (const ssmParamPath of ssmParamPathsList) {
    const params = await loadParamsFromAWS(ssmParamPath)
    listOfSsmParams.push(params) 
  }

  return listOfSsmParams.reduce((curr, ssmParams, index) => {
    curr[index] = ssmParams
    return curr
  }, {});
}

const joinSSMParamsByApplyingHierarchy = (ssmParamsByPrecedence) => {
  const overriddenSsmParamsMap = Object.keys(ssmParamsByPrecedence)
    .reduce((overriddenParams, ssmParamPathIndex) => {
      const ssmParams = ssmParamsByPrecedence[ssmParamPathIndex]

      const ssmParamsMap = ssmParams.reduce((acc, ssmParam) => {
        const envVarName = normalizeEnvVarName(ssmParam)
        return { ...acc, [envVarName]: ssmParam }
      }, {})

      return { ...overriddenParams, ...ssmParamsMap }
    }, {})

  return Object.values(overriddenSsmParamsMap)
}

const groupSSMParamsByType = (ssmParams) => {
  return ssmParams.reduce((current, ssmParam) => {
    switch (ssmParam.Type) {
      case 'String': return { ...current, String: [...current.String, ssmParam] }
      case 'SecureString': return { ...current, SecureString: [...current.SecureString, ssmParam] }
    }
  }, { String: [], SecureString: [] })
}

const createNewTaskDefinitionFile = (newTaskDefinition) => {
  var newTaskDefinitionFile = _notfoundtmp_default().fileSync({
    tmpdir: process.env.RUNNER_TEMP,
    prefix: 'task-definition-',
    postfix: '.json',
    keep: true,
    discardDescriptor: true
  });
  external_fs_default().writeFileSync(newTaskDefinitionFile.name, JSON.stringify(newTaskDefinition, null, 2));

  return newTaskDefinitionFile;
}

const loadEnvironmentVariablesFromSSMIfNecessary = async () => {
  const ssmParamPaths = core.getInput('ssm-param-paths', { required: false });

  if (ssmParamPaths) {
    core.info(`SSM param paths: ${ssmParamPaths}`)
    const ssmParamsByPrecedence = await loadSSMParamsGroupingByPrecedence(ssmParamPaths)
    const finalSsmParams = joinSSMParamsByApplyingHierarchy(ssmParamsByPrecedence)
    const ssmParamsByType = groupSSMParamsByType(finalSsmParams)
  
    return {
      environment: ssmParamsByType.String.map(convertToTaskDefinitionEnvironment),
      secrets: ssmParamsByType.SecureString.map(convertToTaskDefinitionSecret)
    };
  }

  return {};
}

const parsePipelineEnvironmentVariables = () => {
  const envVarInput = core.getInput('environment-variables', { required: false });
  if (!envVarInput) {
    return [];
  }

  return envVarInput.split('\n').map(envVar => {
    const [name, value] = envVar.split('=');
    return { name, value };
  });
}

const mergeEnvironmentVariables = (ssmEnvVars, pipelineEnvVars) => {
  const envVarMap = new Map();

  ssmEnvVars.forEach(envVar => {
    envVarMap.set(envVar.name, envVar.value);
  });

  pipelineEnvVars.forEach(envVar => {
    envVarMap.set(envVar.name, envVar.value);
  });

  return Array.from(envVarMap.entries()).map(([name, value]) => ({ name, value }));
}

const run = async () => {
  try {
    const imageURI = core.getInput('image', { required: true });

    const taskDefinition = await loadTaskDefinitionAsJsObject();
    const containerDefinition = findContainerDefinition(taskDefinition);
    const ssmEnvVars = await loadEnvironmentVariablesFromSSMIfNecessary();
    const pipelineEnvVars = parsePipelineEnvironmentVariables();

    const mergedEnvironment = mergeEnvironmentVariables(ssmEnvVars.environment || [], pipelineEnvVars);

    var newTaskDefinitionFile = createNewTaskDefinitionFile({ 
      ...taskDefinition, 
      containerDefinitions: [
        { 
          ...containerDefinition,
          environment: mergedEnvironment,
          secrets: ssmEnvVars.secrets || [],
          image: imageURI
        }
      ]
    });

    core.setOutput('task-definition', newTaskDefinitionFile.name);
  } catch (error) {
    core.setFailed(error.message);
    core.error(error.stack);
  }
}

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;