import { describe, expect, it } from "vitest";

import { PUBLIC_FAVICON, PUBLIC_SOCIAL_IMAGE } from "@/lib/public-metadata";

describe("public metadata assets", () => {
  it("uses the approved tracked placeholder mark for favicon metadata", () => {
    expect(PUBLIC_FAVICON).toEqual({
      href: expect.stringMatching(/meneer-mark.*\.png$/),
      type: "image/png",
    });
  });

  it("publishes an absolute canonical social-image URL with truthful dimensions", () => {
    expect(PUBLIC_SOCIAL_IMAGE).toEqual({
      url: expect.stringMatching(/^https:\/\/meneerhealth\.co\.za\/.*meneer-mark.*\.png$/),
      secureUrl: expect.stringMatching(/^https:\/\/meneerhealth\.co\.za\/.*meneer-mark.*\.png$/),
      type: "image/png",
      width: "550",
      height: "370",
      alt: "Meneer Health placeholder brand mark",
    });
    expect(PUBLIC_SOCIAL_IMAGE.secureUrl).toBe(PUBLIC_SOCIAL_IMAGE.url);
  });
});
