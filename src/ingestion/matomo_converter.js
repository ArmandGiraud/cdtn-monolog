// Script to convert matomo raw logs into the json format required for analysis

import * as fs from "fs";
import * as bjson from "big-json";

// takes a file, return the content properly formatted
const whitelistNames = [
  "idVisit",
  "timestamp",
  "serverTimePretty",
  "referrerTypeName",
  "referrerName",
  "lastActionTimestamp",
  "lastActionDateTime",
  "referrerTypeName",
  "referrerName",
];

const parseAction = (action, visit) => {
  const parsedAction = {};
  parsedAction["timeSpent"] = action["timeSpent"];
  parsedAction["url"] = action["url"];

  whitelistNames.forEach((key) => {
    parsedAction[key] = visit[key];
  });

  if (action.type == "search") {
    parsedAction["type"] = "search";
    parsedAction["query"] = action.subtitle;
  } else if (action.type == "action") {
    if (action.url.endsWith("gouv.fr/")) {
      parsedAction["type"] = "home";
    } else if (
      action.url.includes("/themes/") ||
      action.url.endsWith("/themes")
    ) {
      parsedAction["type"] = "themes";
    } else if (action.url.endsWith("/outils")) {
      parsedAction["type"] = "outils";
    } else if (action.url.endsWith("/recherche")) {
      parsedAction["type"] = "external_search";
    } else if (action.url.endsWith("/modeles-de-courriers")) {
      parsedAction["type"] = "modeles_courriers";
    } else if (action.url.includes("?dclid=")) {
      parsedAction["type"] = "unknown";
    } else {
      parsedAction["type"] = "visit_content";
    }
  } else if (action.type == "event") {
    switch (action.eventCategory) {
      case "selectedSuggestion": {
        parsedAction["type"] = "select_suggestion";
        parsedAction["suggestionPrefix"] = action.eventAction;
        parsedAction["suggestionSelection"] = action.eventName;
        break;
      }
      case "feedback": {
        parsedAction["type"] = "feedback";
        parsedAction["feedbackType"] = action.eventAction;
        parsedAction["visited"] = action.eventName;
        break;
      }
      case "candidateSuggestions": {
        parsedAction["type"] = "suggestion_candidates";
        parsedAction["suggestionCandidates"] = action.eventAction.split("###");
        break;
      }
      case "candidateResults": {
        parsedAction["type"] = "result_candidates";
        parsedAction["query"] = action.eventAction;
        break;
      }
      case "nextResultPage": {
        parsedAction["type"] = "next_result_page";
        parsedAction["query"] = action.eventAction;
        break;
      }
      case "selectResult": {
        parsedAction["type"] = "select_result";
        parsedAction["resultSelection"] = JSON.parse(action.eventAction);
        break;
      }
      case "themeResults": {
        parsedAction["type"] = "theme_candidates";
        parsedAction["query"] = action.eventAction;
        break;
      }
      default: {
        parsedAction["type"] = action.eventCategory;
        break;
      }
    }
    if (action.eventCategory.startsWith("outil_")) {
      parsedAction["outil"] = action.eventCategory.slice("outil_".length);
      parsedAction["outilEvent"] = action.eventName;
      parsedAction["outilAction"] = action.eventAction;
    }
  } else {
    parsedAction["type"] = action.type;
  }

  // correct broken timezone on Matomo server
  parsedAction["timestamp"] = action.timestamp + 28800;

  return parsedAction;
};

const parseVisit = (visit) => {
  if (visit.actionDetails !== undefined) {
    return visit.actionDetails.flatMap((action) => {
      const pa = parseAction(action, visit);
      // console.log(pa);
      return pa;
    });
  } else {
    return [];
  }
};

export const convertLogs = (path) => {
  const rawData = fs.readFileSync(path);
  const rawVisits = JSON.parse(rawData);

  return rawVisits.flatMap((visit) => {
    // console.log(visit.idVisit);
    return parseVisit(visit);
  });
};

/*
const dates = ["2020-04-15"];

// const dates = ["2020-03-25"];
const path = "/Users/remim/tmp/matomo-dump/";

const allDays = dates.map((d) => {
  const logPath = `${path}${d}.json`;
  console.log(logPath);
  const logs = convertLogs(logPath);
  return [d, logs];
});

const output = "/Users/remim/tmp/cdtn-es-logs/";

allDays.map((entry) => {
  fs.writeFileSync(
    output + entry[0] + ".json",
    JSON.stringify(entry[1], null, 2),
    { flag: "w+" }
  );
});

const stringifyStream = bjson.createStringifyStream({
  body: allDays,
});

const writeStream = fs.createWriteStream(output);

stringifyStream.on("data", function (strChunk) {
  // => BIG_POJO will be sent out in JSON chunks as the object is traversed
  writeStream.write(strChunk);
});

stringifyStream.on("finish", function () {
  writeStream.end();
});
*/