import requests
import json

class JuiceShopAPI:
    def __init__(self, url="http://localhost:3000"):
        self.base_url = url
        self.challenges_endpoint = f"{self.base_url}/api/Challenges"

    def get_challenges(self):
        """
        Fetches all challenges from the Juice Shop API.
        Returns a list of dictionaries.
        """
        try:
            response = requests.get(self.challenges_endpoint)
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
        except requests.exceptions.RequestException as e:
            print(f"Error fetching challenges: {e}")
            return []

    def get_challenge_status(self):
        """
        Returns a dictionary mapping challenge names to their solved status.
        And additional details useful for the UI.
        """
        challenges = self.get_challenges()
        status_map = {}
        for challenge in challenges:
            # Structure: key is unique name, value is dict of details
            status_map[challenge.get("name")] = {
                "id": challenge.get("id"),
                "name": challenge.get("name"),
                "description": challenge.get("description"),
                "difficulty": challenge.get("difficulty"),
                "category": challenge.get("category"),
                "solved": challenge.get("solved", False),
                "hint": challenge.get("hint"),
                "hintUrl": challenge.get("hintUrl")
            }
        return status_map

    def check_connection(self):
        """
        Simple check to see if the API is reachable.
        """
        try:
            response = requests.get(self.base_url)
            return response.status_code == 200
        except:
            return False
