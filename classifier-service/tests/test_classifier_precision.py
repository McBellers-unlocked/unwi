"""Precision validation for classifier_v2 against the hand-labelled ground truth.

Runs classify() over every row in ground_truth_labeled_set.csv and asserts
overall precision >= 0.95. Prints a per-segment precision table so regressions
are visible on the test output.

Precision definition (per segment S): of the rows the classifier assigned to
segment S, what fraction have TRUTH_segment == S? Rows the classifier marked
non-digital (segment=None) count toward the "None" row.
"""
from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

from classifier_v2 import SEGMENT_CODES, classify


GROUND_TRUTH = (
    Path(__file__).parent.parent / "reference" / "ground_truth_labeled_set.csv"
)
TARGET_PRECISION = 0.95


def _load_rows() -> list[dict[str, str]]:
    with GROUND_TRUTH.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def test_classifier_precision_per_segment():
    rows = _load_rows()
    assert rows, "ground truth set is empty"

    predicted_for_segment: dict[str, int] = defaultdict(int)
    correct_for_segment: dict[str, int] = defaultdict(int)

    for r in rows:
        seg, _conf, _reason = classify(
            {
                "title": r.get("title", ""),
                "description": r.get("description_short", ""),
                "organization": r.get("organization", ""),
            }
        )
        pred_key = seg if seg else "None"
        truth_digital = (r.get("TRUTH_digital") or "").strip().upper()
        truth_seg = (r.get("TRUTH_segment") or "").strip()

        if truth_digital == "YES":
            expected = truth_seg
        else:
            expected = "None"

        predicted_for_segment[pred_key] += 1
        if pred_key == expected:
            correct_for_segment[pred_key] += 1

    all_keys = sorted(set(predicted_for_segment) | set(correct_for_segment))

    total_predicted = sum(predicted_for_segment.values())
    total_correct = sum(correct_for_segment.values())
    overall = total_correct / total_predicted if total_predicted else 0.0

    print()
    print(f"{'SEGMENT':20} {'PREDICTED':>10} {'CORRECT':>10} {'PRECISION':>10}")
    print("-" * 55)
    for key in all_keys:
        p = predicted_for_segment[key]
        c = correct_for_segment[key]
        prec = c / p if p else 0.0
        print(f"{key:20} {p:>10} {c:>10} {prec:>10.3f}")
    print("-" * 55)
    print(f"{'OVERALL':20} {total_predicted:>10} {total_correct:>10} {overall:>10.3f}")

    unexpected = set(predicted_for_segment) - SEGMENT_CODES - {"None"}
    assert not unexpected, f"classifier emitted unknown segments: {unexpected}"

    assert overall >= TARGET_PRECISION, (
        f"overall precision {overall:.3f} < {TARGET_PRECISION} target "
        f"(predicted={total_predicted}, correct={total_correct})"
    )
