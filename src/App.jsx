import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Trash2, Edit, Plus, CheckCircle, XCircle, Save, X } from 'lucide-react';

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Stan formularza
  const [currentId, setCurrentId] = useState(null);
  const [questionText, setQuestionText] = useState('');
  // Inicjalizujemy 4 puste odpowiedzi
  const [answersState, setAnswersState] = useState([
    { content: '', is_correct: false },
    { content: '', is_correct: false },
    { content: '', is_correct: false },
    { content: '', is_correct: false },
  ]);

  // Pobieranie danych
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    // Pobieramy pytania wraz z odpowiedziami
    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        answers (*)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('Błąd pobierania:', error);
    else setQuestions(data);
    setLoading(false);
  };

  // Resetowanie formularza
  const resetForm = () => {
    setQuestionText('');
    setAnswersState([
      { content: '', is_correct: false },
      { content: '', is_correct: false },
      { content: '', is_correct: false },
      { content: '', is_correct: false },
    ]);
    setIsEditing(false);
    setCurrentId(null);
  };

  // Obsługa edycji
  const handleEdit = (q) => {
    setQuestionText(q.content);
    setCurrentId(q.id);

    // Dopasuj istniejące odpowiedzi do formularza (max 4)
    const newAnswers = [...q.answers];
    while (newAnswers.length < 4) newAnswers.push({ content: '', is_correct: false });

    setAnswersState(newAnswers.slice(0, 4).map(a => ({
      content: a.content,
      is_correct: a.is_correct
    })));

    setIsEditing(true);
  };

  // Obsługa zapisywania (Dodawanie i Edycja)
  const handleSave = async () => {
    if (!questionText.trim()) return alert("Treść pytania jest wymagana!");

    try {
      let questionId = currentId;

      if (isEditing) {
        // 1. Aktualizuj pytanie
        const { error: qError } = await supabase
          .from('questions')
          .update({ content: questionText })
          .eq('id', currentId);
        if (qError) throw qError;

        // 2. Usuń stare odpowiedzi
        await supabase.from('answers').delete().eq('question_id', currentId);
      } else {
        // 1. Dodaj nowe pytanie
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert([{ content: questionText }])
          .select()
          .single();
        if (qError) throw qError;
        questionId = qData.id;
      }

      // 3. Dodaj odpowiedzi
      const answersToInsert = answersState.map(a => ({
        question_id: questionId,
        content: a.content,
        is_correct: a.is_correct
      }));

      const { error: aError } = await supabase.from('answers').insert(answersToInsert);
      if (aError) throw aError;

      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error("Błąd zapisu:", error);
      alert("Wystąpił błąd podczas zapisywania.");
    }
  };

  // Obsługa usuwania
  const handleDelete = async (id) => {
    if (!window.confirm("Czy na pewno chcesz usunąć to pytanie?")) return;

    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) console.error("Błąd usuwania:", error);
    else fetchQuestions();
  };

  const updateAnswerState = (index, field, value) => {
    const newAnswers = [...answersState];
    newAnswers[index][field] = value;
    setAnswersState(newAnswers);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Menedżer Pytań (Supabase)
        </h1>

        {/* --- FORMULARZ --- */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-10 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
              {isEditing ? 'Edytuj Pytanie' : 'Dodaj Nowe Pytanie'}
            </h2>
            {isEditing && (
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Treść pytania</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Wpisz treść pytania..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {answersState.map((answer, index) => (
              <div key={index} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <input
                    type="text"
                    className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1 text-sm"
                    placeholder={`Odpowiedź ${index + 1}`}
                    value={answer.content}
                    onChange={(e) => updateAnswerState(index, 'content', e.target.value)}
                  />
                </div>
                <div
                  onClick={() => updateAnswerState(index, 'is_correct', !answer.is_correct)}
                  className={`cursor-pointer p-2 rounded-full transition-colors ${answer.is_correct ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                    }`}
                  title="Oznacz jako poprawną"
                >
                  <CheckCircle size={20} />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isEditing ? <Save size={20} /> : <Plus size={20} />}
            {isEditing ? 'Zapisz Zmiany' : 'Dodaj Pytanie'}
          </button>
        </div>

        {/* --- LISTA PYTAŃ --- */}
        {loading ? (
          <p className="text-center text-gray-500">Ładowanie...</p>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-800">{q.content}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(q)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.answers && q.answers.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center p-3 rounded-lg border ${a.is_correct
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-white border-gray-200 text-gray-600'
                        }`}
                    >
                      {a.is_correct ? (
                        <CheckCircle size={16} className="mr-2 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle size={16} className="mr-2 text-gray-300 flex-shrink-0" />
                      )}
                      <span className="text-sm">{a.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                Brak pytań. Dodaj pierwsze powyżej!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}