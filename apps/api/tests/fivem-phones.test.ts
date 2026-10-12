import { expect, test } from "vitest";
import { describeFivemPhones, phoneIdList, pickPhoneNumber } from "../src/lib/fivem/phones";

test("Should keep the first number whose phone is switched on, framework first", () => {
  const phones = { "lb-phone": "5550001", framework: "555-1234" };
  expect(pickPhoneNumber({ phones, fallback: "x", disabled: [] })).toBe("555-1234");
  expect(pickPhoneNumber({ phones, fallback: "x", disabled: ["framework"] })).toBe("5550001");
  expect(pickPhoneNumber({ phones, fallback: "x", disabled: ["framework", "lb-phone"] })).toBe(
    null,
  );
});

test("Should use the resource's own pick when it doesn't send phones (older resource)", () => {
  expect(pickPhoneNumber({ phones: undefined, fallback: "555", disabled: [] })).toBe("555");
  expect(pickPhoneNumber({ phones: null, fallback: null, disabled: [] })).toBe(null);
});

test("Should ignore unknown phone ids and blank numbers", () => {
  expect(phoneIdList(["lb-phone", "made-up", 3])).toEqual(["lb-phone"]);
  expect(phoneIdList(null)).toEqual([]);
  expect(pickPhoneNumber({ phones: { framework: "  " }, fallback: "x", disabled: [] })).toBe(null);
});

test("Should describe each phone with its switch and whether it was detected", () => {
  const described = describeFivemPhones({
    disabledPhones: ["lb-phone"],
    detectedPhones: ["framework"],
  });
  const lb = described.find((phone) => phone.id === "lb-phone");
  const framework = described.find((phone) => phone.id === "framework");
  expect(lb).toMatchObject({ enabled: false, detected: false });
  expect(framework).toMatchObject({ enabled: true, detected: true });
  expect(describeFivemPhones({ disabledPhones: null, detectedPhones: null })[0]!.detected).toBe(
    null,
  );
});
