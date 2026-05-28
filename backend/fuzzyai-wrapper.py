#!/usr/bin/env python3
"""
FuzzyAI Wrapper for AI Cybersecurity Platform
Integrates CyberArk's FuzzyAI LLM jailbreak testing tool
"""

import asyncio
import json
import sys
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)

logger = logging.getLogger(__name__)

try:
    from fuzzyai.fuzzer import Fuzzer
    from fuzzyai.handlers.attacks.enums import FuzzerAttackMode
    from fuzzyai.handlers.classifiers.harmful_llm.handler import HarmfulLLMClassifier
    from fuzzyai.handlers.classifiers.rating.handler import RatingClassifier
    from fuzzyai.llm.providers.enums import LLMProvider
    FUZZYAI_AVAILABLE = True
except ImportError as e:
    logger.warning(f"FuzzyAI not available: {e}")
    FUZZYAI_AVAILABLE = False


# Attack mode mapping
ATTACK_MODES = {
    'default': FuzzerAttackMode.DEFAULT if FUZZYAI_AVAILABLE else 'DEFAULT',
    'artprompt': FuzzerAttackMode.ARTPROMPT if FUZZYAI_AVAILABLE else 'ARTPROMPT',
    'taxonomy': FuzzerAttackMode.TAXONOMY if FUZZYAI_AVAILABLE else 'TAXONOMY',
    'pair': FuzzerAttackMode.PAIR if FUZZYAI_AVAILABLE else 'PAIR',
    'manyshot': FuzzerAttackMode.MANYSHOT if FUZZYAI_AVAILABLE else 'MANYSHOT',
    'dan': FuzzerAttackMode.DAN if FUZZYAI_AVAILABLE else 'DAN',
    'genetic': FuzzerAttackMode.GENETIC if FUZZYAI_AVAILABLE else 'GENETIC',
    'hallucinations': FuzzerAttackMode.HALLUCINATIONS if FUZZYAI_AVAILABLE else 'HALLUCINATIONS',
    'wordgame': FuzzerAttackMode.WORDGAME if FUZZYAI_AVAILABLE else 'WORDGAME',
    'crescendo': FuzzerAttackMode.CRESCENDO if FUZZYAI_AVAILABLE else 'CRESCENDO',
    'ascii_smuggling': FuzzerAttackMode.ASCII_SMUGGLING if FUZZYAI_AVAILABLE else 'ASCII_SMUGGLING',
}


async def run_jailbreak_test(
    model: str,
    prompts: List[str],
    attack_modes: List[str],
    ollama_host: str = "YOUR_SERVER_IP",
    ollama_port: int = 8888,
    max_workers: int = 2,
    max_tokens: int = 500
) -> Dict[str, Any]:
    """
    Run jailbreak testing using FuzzyAI

    Args:
        model: Ollama model name (e.g., 'qwen3-vl:4b')
        prompts: List of prompts to test
        attack_modes: List of attack mode names
        ollama_host: Ollama server host
        ollama_port: Ollama server port
        max_workers: Number of parallel workers
        max_tokens: Maximum tokens for response

    Returns:
        Dictionary with test results
    """

    if not FUZZYAI_AVAILABLE:
        return {
            'success': False,
            'error': 'FuzzyAI not installed',
            'message': 'Please install FuzzyAI: pip install git+https://github.com/cyberark/FuzzyAI.git'
        }

    try:
        logger.info(f"Initializing FuzzyAI fuzzer for model: {model}")
        logger.info(f"Attack modes: {attack_modes}")
        logger.info(f"Prompts to test: {len(prompts)}")

        # Initialize fuzzer
        fuzzer = Fuzzer(
            max_workers=max_workers,
            attack_model=f"ollama/{model}",
            target_model=f"ollama/{model}",
            judge_model=f"ollama/{model}",
            db_address="127.0.0.1"
        )

        # Add Ollama LLM
        fuzzer.add_llm(
            f"{LLMProvider.OLLAMA.value}/{model}",
            llm_address=ollama_host,
            port=ollama_port,
            seed=0
        )

        # Add classifier (determines if jailbreak succeeded)
        fuzzer.add_classifier(HarmfulLLMClassifier())

        # Convert attack mode names to enums
        attack_mode_enums = []
        for mode in attack_modes:
            if mode.lower() in ATTACK_MODES:
                attack_mode_enums.append(ATTACK_MODES[mode.lower()])
            else:
                logger.warning(f"Unknown attack mode: {mode}, using DEFAULT")
                attack_mode_enums.append(FuzzerAttackMode.DEFAULT)

        logger.info("Starting fuzzing process...")

        # Run fuzzing
        report, results = await fuzzer.fuzz(
            attack_modes=attack_mode_enums,
            model=[f"ollama/{model}"],
            prompts=prompts,
            max_tokens=max_tokens
        )

        # Process results
        test_results = []

        if results and hasattr(results, '__iter__'):
            for result in results:
                try:
                    test_result = {
                        'prompt': getattr(result, 'prompt', 'Unknown'),
                        'attack_mode': getattr(result, 'attack_mode', 'Unknown'),
                        'response': getattr(result, 'response', 'No response'),
                        'jailbreak_success': getattr(result, 'is_jailbroken', False),
                        'score': getattr(result, 'score', 0.0),
                        'metadata': getattr(result, 'metadata', {})
                    }
                    test_results.append(test_result)
                except Exception as e:
                    logger.error(f"Error processing result: {e}")
                    continue

        logger.info(f"Fuzzing completed. {len(test_results)} results generated.")

        return {
            'success': True,
            'model': model,
            'total_tests': len(test_results),
            'results': test_results,
            'summary': {
                'total_jailbreaks': sum(1 for r in test_results if r.get('jailbreak_success', False)),
                'attack_modes_tested': len(attack_mode_enums),
                'prompts_tested': len(prompts)
            }
        }

    except Exception as e:
        logger.error(f"Jailbreak testing failed: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'traceback': sys.exc_info()
        }


async def test_single_prompt(
    prompt: str,
    model: str = "qwen3-vl:4b",
    attack_mode: str = "default"
) -> Dict[str, Any]:
    """
    Quick test for a single prompt
    """
    return await run_jailbreak_test(
        model=model,
        prompts=[prompt],
        attack_modes=[attack_mode],
        max_workers=1
    )


def main():
    """
    Main entry point for command line usage
    Expects JSON input via stdin
    """
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        # Extract parameters
        model = input_data.get('model', 'qwen3-vl:4b')
        prompts = input_data.get('prompts', [])
        attack_modes = input_data.get('attack_modes', ['default'])
        ollama_host = input_data.get('ollama_host', 'YOUR_SERVER_IP')
        ollama_port = input_data.get('ollama_port', 8888)
        max_workers = input_data.get('max_workers', 2)
        max_tokens = input_data.get('max_tokens', 500)

        # Validate inputs
        if not prompts:
            print(json.dumps({
                'success': False,
                'error': 'No prompts provided'
            }))
            return

        # Run async test
        result = asyncio.run(run_jailbreak_test(
            model=model,
            prompts=prompts,
            attack_modes=attack_modes,
            ollama_host=ollama_host,
            ollama_port=ollama_port,
            max_workers=max_workers,
            max_tokens=max_tokens
        ))

        # Output result as JSON
        print(json.dumps(result, indent=2))

    except json.JSONDecodeError as e:
        print(json.dumps({
            'success': False,
            'error': f'Invalid JSON input: {str(e)}'
        }))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))


if __name__ == '__main__':
    main()
