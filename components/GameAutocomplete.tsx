'use client';

import { useState, useEffect, useRef } from 'react';

interface Game {
  id: number;
  slug: string;
  name: string;
  aliases: string[];
}

interface GameAutocompleteProps {
  value: string;
  onChange: (value: string, gameId?: number) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export default function GameAutocomplete({
  value,
  onChange,
  placeholder,
  id,
  name,
  required,
}: GameAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/games/search?q=${encodeURIComponent(value)}&limit=10`);
        if (response.ok) {
          const games = await response.json();
          setSuggestions(games);
        }
      } catch (error) {
        console.error('Failed to fetch game suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleSelectGame = (game: Game) => {
    onChange(game.name, game.id);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectGame(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="game-autocomplete">
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {isOpen && (value.length >= 2 || suggestions.length > 0) && (
        <div ref={dropdownRef} className="game-autocomplete__dropdown">
          {isLoading ? (
            <div className="game-autocomplete__item game-autocomplete__item--muted">
              Loading...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((game, index) => (
              <div
                key={game.id}
                className={`game-autocomplete__item ${index === selectedIndex ? 'game-autocomplete__item--selected' : ''}`}
                onClick={() => handleSelectGame(game)}
              >
                {game.name}
                {game.aliases.length > 0 && (
                  <span className="game-autocomplete__aliases">
                    ({game.aliases.slice(0, 2).join(', ')})
                  </span>
                )}
              </div>
            ))
          ) : value.length >= 2 ? (
            <div className="game-autocomplete__item game-autocomplete__item--muted">
              No games found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
