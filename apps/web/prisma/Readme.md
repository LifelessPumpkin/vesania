
# DB Design

Make one table that represents “what this card is” , and physical copies point to it .
 • CardDefinition = Sword / Fireball / Eruptor (type, name, rules text, etc.)
 • Card = physical copy (publicCode, ownerId, definitionId)

Then you don’t need multiple foreign keys or a weird enum mapping .

Sketch:
 • CardDefinition { id, type (CHARACTER|ITEM|SPELL), name, rarity, description, effectJson, ... }
 • Card { id, publicCode, status, ownerId?, definitionId }

Your game-specific “Character” details can either live:
 • directly on CardDefinition (if you’re ok with JSON / optional fields)
 • or in subtype tables (see Pattern B)
