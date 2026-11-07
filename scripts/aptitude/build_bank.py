"""Reproducible, reviewed MCQ bank. The application reads the generated JSON, not this script.
Original exercises are labelled ORIGINAL. Paraphrased GATE items carry paper/key/Q references.
"""
import json
import random
from collections import Counter
from fractions import Fraction
from pathlib import Path

BANK = []

def fmt(value):
    if isinstance(value, Fraction):
        return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"
    if isinstance(value, float):
        return f"{value:.2f}".rstrip("0").rstrip(".")
    return str(value)

def add(category, topic, title, prompt, answer, distractors, explanation, difficulty="Hard", passage="", source=None):
    choices = [fmt(answer)] + [fmt(x) for x in distractors]
    assert len(choices) == 4 and len(set(choices)) == 4, (title, choices)
    assert prompt and explanation and category in ("Quantitative", "Reasoning", "Verbal")
    number = len(BANK) + 1
    random.Random(9000 + number).shuffle(choices)
    BANK.append(dict(id=number, category=category, topic=topic, title=title, prompt=prompt,
        passage=passage, options=choices, correctIndex=choices.index(fmt(answer)), explanation=explanation,
        difficulty=difficulty, source=source or {"kind":"ORIGINAL", "label":"SkillNex original · placement / GATE-pattern practice"}))

def numeric(topic, title, prompt, answer, explanation, difficulty="Hard", category="Quantitative", distractors=None):
    answer = Fraction(answer)
    if distractors is None:
        step = max(1, abs(answer.numerator // answer.denominator) // 5)
        distractors = [answer + step, answer - step, answer + 2 * step]
    add(category, topic, title, prompt, answer, distractors, explanation, difficulty)

def build():
    from quantitative import populate as quant
    from reasoning import populate as reason
    from verbal import populate as verbal
    from gate_sources import populate as gate
    for producer, expected in [(quant,180),(reason,160),(verbal,140),(gate,20)]:
        before=len(BANK); producer(add,numeric,fmt); assert len(BANK)-before == expected, (producer.__module__,len(BANK)-before)
    assert len(BANK)==500
    assert len({(q['prompt'],q['passage']) for q in BANK})==500, 'Duplicate questions'
    assert len({q['id'] for q in BANK})==500
    target=Path(__file__).resolve().parents[2]/'backend/src/main/resources/aptitude/questions.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(BANK,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'questions':len(BANK),'categories':dict(Counter(q['category'] for q in BANK)),
        'difficulty':dict(Counter(q['difficulty'] for q in BANK)), 'topics':len({q['topic'] for q in BANK}),
        'sources':dict(Counter(q['source']['kind'] for q in BANK))},indent=2))

if __name__=='__main__': build()
