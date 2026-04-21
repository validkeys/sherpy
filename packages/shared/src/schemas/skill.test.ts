/**
 * Unit tests for Skill and PersonSkill domain schemas
 */

import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { PersonSkill, Skill, SkillProficiency } from "./skill"

describe("Skill Schemas", () => {
  describe("SkillProficiency enum", () => {
    it.effect("accepts valid proficiency levels", () =>
      Effect.gen(function* () {
        const levels = ["beginner", "intermediate", "advanced", "expert"] as const
        for (const level of levels) {
          const decoded = yield* Schema.decodeUnknown(SkillProficiency)(level)
          expect(decoded).toBe(level)
        }
      }),
    )
  })

  describe("Skill model", () => {
    it.effect("creates valid skill", () =>
      Effect.gen(function* () {
        const skill = new Skill({
          id: "skill-123",
          name: "TypeScript",
          category: "Programming Languages",
        })

        expect(skill.name).toBe("TypeScript")
        expect(skill.category).toBe("Programming Languages")
      }),
    )
  })

  describe("PersonSkill model", () => {
    it.effect("creates valid person-skill association", () =>
      Effect.gen(function* () {
        const personSkill = new PersonSkill({
          personId: "person-123",
          skillId: "skill-456",
          proficiency: "intermediate" as const,
        })

        expect(personSkill.personId).toBe("person-123")
        expect(personSkill.proficiency).toBe("intermediate")
      }),
    )
  })
})
