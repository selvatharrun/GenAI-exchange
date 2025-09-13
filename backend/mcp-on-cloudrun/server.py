import asyncio
import logging
import os
from typing import List, Dict, Any

from fastmcp import FastMCP

logger = logging.getLogger(__name__)
logging.basicConfig(format="[%(levelname)s]: %(message)s", level=logging.INFO)

mcp = FastMCP("Zoo Animal MCP Server 🦁🐧🐻")

# Dictionary of animals at the zoo
ZOO_ANIMALS = [
    {
        "species": "lion",
        "name": "Leo",
        "age": 7,
        "enclosure": "The Big Cat Plains",
        "trail": "Savannah Heights"
    },
    {
        "species": "walrus",
        "name": "Flippers",
        "age": 9,
        "enclosure": "The Walrus Cove",
        "trail": "Polar Path"
    }
]

@mcp.tool()
def get_animals_by_species(species: str) -> List[Dict[str, Any]]:
    """
    Retrieves all animals of a specific species from the zoo.
    Can also be used to collect the base data for aggregate queries
    of animals of a specific species - like counting the number of penguins
    or finding the oldest lion.

    Args:
        species: The species of the animal (e.g., 'lion', 'penguin').

    Returns:
        A list of dictionaries, where each dictionary represents an animal
        and contains details like name, age, enclosure, and trail.
    """
    logger.info(f">>> 🛠️ Tool: 'get_animals_by_species' called for '{species}'")
    return [animal for animal in ZOO_ANIMALS if animal["species"].lower() == species.lower()]

@mcp.tool()
def get_animal_details(name: str) -> Dict[str, Any]:
    """
    Retrieves the details of a specific animal by its name.

    Args:
        name: The name of the animal.

    Returns:
        A dictionary with the animal's details (species, name, age, enclosure, trail)
        or an empty dictionary if the animal is not found.
    """
    logger.info(f">>> 🛠️ Tool: 'get_animal_details' called for '{name}'")
    for animal in ZOO_ANIMALS:
        if animal["name"].lower() == name.lower():
            return animal
    return {}

if __name__ == "__main__":
    logger.info(f"🚀 MCP server started on port {os.getenv('PORT', 8080)}")
    asyncio.run(
        mcp.run_async(
            transport="http",
            host="0.0.0.0",
            port=os.getenv("PORT", 8080),
        )
    )