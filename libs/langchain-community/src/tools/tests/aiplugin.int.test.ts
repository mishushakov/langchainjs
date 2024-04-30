import { test, expect } from "@jest/globals";
import { AIPluginTool } from "../aiplugin.js";

test("AIPluginTool", async () => {
  const tool = await AIPluginTool.fromPluginUrl(
    "https://www.klarna.com/.well-known/ai-plugin.json"
  );

  expect(await tool.invoke({})).toMatchInlineSnapshot(`
    "Usage Guide: Assistant uses the Klarna plugin to get relevant product suggestions for any shopping or product discovery purpose. Assistant will reply with the following 3 paragraphs 1) Search Results 2) Product Comparison of the Search Results 3) Followup Questions. The first paragraph contains a list of the products with their attributes listed clearly and concisely as bullet points under the product, together with a link to the product and an explanation. Links will always be returned and should be shown to the user. The second paragraph compares the results returned in a summary sentence starting with "In summary". Assistant comparisons consider only the most important features of the products that will help them fit the users request, and each product mention is brief, short and concise. In the third paragraph assistant always asks helpful follow-up questions and end with a question mark. When assistant is asking a follow-up question, it uses it's product expertise to provide information pertaining to the subject of the user's request that may guide them in their search for the right product.

    OpenAPI Spec in JSON or YAML format:
    {"openapi":"3.0.1","info":{"version":"v0","title":"Open AI Klarna product Api"},"servers":[{"url":"https://www.klarna.com/us/shopping"}],"tags":[{"name":"open-ai-product-endpoint","description":"Open AI Product Endpoint. Query for products."}],"paths":{"/public/openai/v0/products":{"get":{"tags":["open-ai-product-endpoint"],"summary":"API for fetching Klarna product information","operationId":"productsUsingGET","parameters":[{"name":"countryCode","in":"query","description":"ISO 3166 country code with 2 characters based on the user location. Currently, only US, GB, DE, SE and DK are supported.","required":true,"schema":{"type":"string"}},{"name":"q","in":"query","description":"A precise query that matches one very small category or product that needs to be searched for to find the products the user is looking for. If the user explicitly stated what they want, use that as a query. The query is as specific as possible to the product name or category mentioned by the user in its singular form, and don't contain any clarifiers like latest, newest, cheapest, budget, premium, expensive or similar. The query is always taken from the latest topic, if there is a new topic a new query is started. If the user speaks another language than English, translate their request into English (example: translate fia med knuff to ludo board game)!","required":true,"schema":{"type":"string"}},{"name":"size","in":"query","description":"number of products returned","required":false,"schema":{"type":"integer"}},{"name":"min_price","in":"query","description":"(Optional) Minimum price in local currency for the product searched for. Either explicitly stated by the user or implicitly inferred from a combination of the user's request and the kind of product searched for.","required":false,"schema":{"type":"integer"}},{"name":"max_price","in":"query","description":"(Optional) Maximum price in local currency for the product searched for. Either explicitly stated by the user or implicitly inferred from a combination of the user's request and the kind of product searched for.","required":false,"schema":{"type":"integer"}}],"responses":{"200":{"description":"Products found","content":{"application/json":{"schema":{"$ref":"#/components/schemas/ProductResponse"}}}},"503":{"description":"one or more services are unavailable"}},"deprecated":false}}},"components":{"schemas":{"Product":{"type":"object","properties":{"attributes":{"type":"array","items":{"type":"string"}},"name":{"type":"string"},"price":{"type":"string"},"url":{"type":"string"}},"title":"Product"},"ProductResponse":{"type":"object","properties":{"products":{"type":"array","items":{"$ref":"#/components/schemas/Product"}}},"title":"ProductResponse"}}}}"
  `);

  expect(await tool.invoke({})).toMatch(/Usage Guide/);

  expect(await tool.invoke("")).toMatch(/OpenAPI Spec/);
});
